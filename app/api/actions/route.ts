import { NextRequest, NextResponse } from "next/server";
import { authenticated, admin } from "@/lib/supabase";
import { listingSchema } from "@/lib/domain";
import { sameOrigin, failure } from "@/lib/http";
import { z } from "zod";
const uuid = z.string().uuid();
export async function POST(req: NextRequest) {
  let form = false;
  try {
    sameOrigin(req);
    const { client, user } = await authenticated();
    form = !req.headers.get("content-type")?.includes("application/json");
    const b = form
      ? Object.fromEntries(await req.formData())
      : await req.json();
    const { error: limit } = await client.rpc("claim_usage", {
      p_action: "action",
    });
    if (limit) throw new Error("Too many changes. Please try again later.");
    let result: any;
    let id: string | undefined;
    switch (b.action) {
      case "publish": {
        const listing = listingSchema.parse(b);
        const { count } = await client
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .gte("created_at", new Date(Date.now() - 3600000).toISOString());
        if ((count ?? 0) >= 20)
          throw new Error("Listing limit reached. Try again later.");
        result = await client
          .from("listings")
          .insert({ ...listing, seller_id: user.id })
          .select("id")
          .single();
        id = result.data?.id;
        break;
      }
      case "profile":
        result = await client
          .from("profiles")
          .update(
            z
              .object({
                display_name: z.string().trim().min(2).max(80),
                bio: z.string().max(500),
                town: z.string().max(80),
              })
              .parse(b),
          )
          .eq("id", user.id);
        break;
      case "favorite":
        result = await client
          .from("favorites")
          .upsert({ user_id: user.id, listing_id: uuid.parse(b.listing_id) });
        break;
      case "unfavorite":
        result = await client
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", uuid.parse(b.listing_id));
        break;
      case "search": {
        const f = z
          .object({
            size: z.string().max(40),
            brand: z.string().max(80),
            category: z.string().max(20),
            condition: z.string().max(40),
            location: z.string().max(80),
            max_price: z.string().regex(/^\d*$/),
          })
          .parse(b);
        result = await client
          .from("saved_searches")
          .insert({
            user_id: user.id,
            name: z.string().min(2).max(80).parse(b.name),
            filters: Object.fromEntries(
              Object.entries(f).filter(([, v]) => v !== ""),
            ),
          });
        break;
      }
      case "delete_search":
        result = await client
          .from("saved_searches")
          .delete()
          .eq("id", uuid.parse(b.id))
          .eq("user_id", user.id);
        break;
      case "offer":
        result = await client.from("offers").insert({
          listing_id: uuid.parse(b.listing_id),
          buyer_id: user.id,
          amount_pence: z
            .number()
            .int()
            .min(100)
            .max(100000)
            .parse(Math.round(Number(b.amount) * 100)),
        });
        break;
      case "accept_offer":
        result = await client.rpc("accept_offer", {
          p_offer: uuid.parse(b.id),
        });
        break;
      case "message":
        result = await client
          .from("messages")
          .insert({
            order_id: uuid.parse(b.order_id),
            sender_id: user.id,
            body: z.string().trim().min(1).max(2000).parse(b.body),
          });
        break;
      case "report":
        result = await client
          .from("reports")
          .insert({
            reporter_id: user.id,
            listing_id: uuid.parse(b.listing_id),
            reason: z.string().trim().min(10).max(2000).parse(b.reason),
          });
        break;
      case "dispute":
        result = await client
          .from("disputes")
          .insert({
            opened_by: user.id,
            order_id: uuid.parse(b.order_id),
            reason: z.string().trim().min(10).max(2000).parse(b.reason),
          });
        break;
      case "complete": {
        const a = admin();
        const { data: o } = await a
          .from("orders")
          .select("id")
          .eq("id", uuid.parse(b.id))
          .eq("buyer_id", user.id)
          .in("status", ["paid", "shipped"])
          .single();
        if (!o) throw new Error("Order unavailable");
        result = await a
          .from("orders")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", o.id)
          .in("status", ["paid", "shipped"]);
        break;
      }
      case "remove": {
        const a = admin();
        const { data: role } = await client.rpc("is_admin");
        const query = a
          .from("listings")
          .update({ status: "removed" })
          .eq("id", uuid.parse(b.listing_id))
          .eq("status", "active");
        result = await (role ? query : query.eq("seller_id", user.id));
        break;
      }
      case "record_acquisition":
      case "record_cost": {
        const { data: role } = await client.rpc("is_admin");
        if (!role) throw new Error("Administrator access required");
        const a = admin();
        if (b.action === "record_acquisition") {
          result = await a
            .from("acquisition_costs")
            .insert({
              channel: z.string().min(2).max(80).parse(b.channel),
              amount_pence: z.coerce
                .number()
                .int()
                .min(0)
                .max(100000000)
                .parse(b.amount_pence),
            });
        } else {
          result = await a
            .from("order_costs")
            .upsert({
              order_id: uuid.parse(b.order_id),
              ...z
                .object({
                  processing_pence: z.coerce.number().int().min(0),
                  shipping_subsidy_pence: z.coerce.number().int().min(0),
                  other_pence: z.coerce.number().int().min(0),
                })
                .parse(b),
            });
        }
        break;
      }
      case "resolve_report":
      case "resolve_dispute": {
        const { data: role } = await client.rpc("is_admin");
        if (!role) throw new Error("Administrator access required");
        result = await admin()
          .from(b.action === "resolve_report" ? "reports" : "disputes")
          .update({ status: "resolved" })
          .eq("id", uuid.parse(b.id));
        break;
      }
      default:
        throw new Error("Unknown action");
    }
    if (result?.error) throw new Error(result.error.message);
    if (form)
      return NextResponse.redirect(
        new URL("/account?notice=Saved", req.url),
        303,
      );
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    if (form)
      return NextResponse.redirect(
        new URL(
          "/account?error=" +
            encodeURIComponent(
              e instanceof Error ? e.message : "Unable to save",
            ),
          req.url,
        ),
        303,
      );
    return failure(e);
  }
}
