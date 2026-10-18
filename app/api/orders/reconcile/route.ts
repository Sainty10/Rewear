import { NextRequest, NextResponse } from "next/server";
import { authenticated, admin } from "@/lib/supabase";
import { stripe } from "@/lib/payments";
import { sameOrigin } from "@/lib/http";
import { reconcileOrder } from "@/lib/reconcile";
import { z } from "zod";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { client, user } = await authenticated();
    const { error: limit } = await client.rpc("claim_usage", {
      p_action: "action",
    });
    if (limit)
      throw new Error("Too many payment checks. Please try again later.");
    const f = await req.formData();
    const id = z.string().uuid().parse(f.get("id"));
    const a = admin();
    const { data: o, error } = await a
      .from("orders")
      .select(
        "id,buyer_id,seller_id,status,created_at,stripe_session_id,amount_pence",
      )
      .eq("id", id)
      .single();
    const { data: role } = await client.rpc("is_admin");
    if (
      error ||
      !o ||
      (o.buyer_id !== user.id && o.seller_id !== user.id && !role)
    )
      throw new Error("Order unavailable");
    const notice = await reconcileOrder(stripe(), a, o);
    return NextResponse.redirect(
      new URL("/account?notice=" + encodeURIComponent(notice), req.url),
      303,
    );
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        "/account?error=" +
          encodeURIComponent(
            e instanceof Error ? e.message : "Unable to check payment status",
          ),
        req.url,
      ),
      303,
    );
  }
}
