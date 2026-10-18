import { NextRequest, NextResponse } from "next/server";
import { authenticated, admin } from "@/lib/supabase";
import { stripe } from "@/lib/payments";
import { sameOrigin, failure } from "@/lib/http";
import { z } from "zod";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { client, user } = await authenticated();
    const s = stripe();
    const f = await req.formData();
    const a = admin();
    let id: string;
    if (f.get("order_id")) {
      id = z.string().uuid().parse(f.get("order_id"));
    } else {
      const listing = z.string().uuid().parse(f.get("listing_id"));
      const delivery = z.enum(["pickup", "shipping"]).parse(f.get("delivery"));
      if (delivery === "shipping")
        throw new Error(
          "Shipping checkout is not enabled yet. Choose local pickup when available.",
        );
      const { data, error } = await client.rpc("reserve_bundle", {
        p_listing: listing,
        p_delivery: delivery,
      });
      if (error) throw new Error(error.message);
      id = data;
    }
    const { data: o, error } = await a
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("buyer_id", user.id)
      .single();
    if (error || !o || o.status !== "pending")
      throw new Error("Pending order unavailable");
    if (o.stripe_session_id) {
      const session = await s.checkout.sessions.retrieve(o.stripe_session_id);
      if (session.status === "open" && session.url)
        return NextResponse.redirect(session.url, 303);
      throw new Error(
        "This checkout is closed. Wait for payment confirmation or reservation expiry.",
      );
    }
    const { data: seller } = await a
      .from("profiles")
      .select("stripe_account_id,charges_enabled")
      .eq("id", o.seller_id)
      .single();
    if (!seller?.stripe_account_id || !seller.charges_enabled)
      throw new Error("Seller payment onboarding is incomplete");
    const { data: l } = await a
      .from("listings")
      .select("title")
      .eq("id", o.listing_id)
      .single();
    // A fixed expiry keeps the Stripe idempotency request identical across retries.
    const expires = Math.floor(new Date(o.created_at).getTime() / 1000) + 3600;
    if (expires < Math.floor(Date.now() / 1000) + 1800)
      throw new Error(
        "Reservation needs reconciliation. Contact marketplace support; do not start another payment.",
      );
    const session = await s.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: id,
        metadata: { order_id: id },
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: "gbp",
              unit_amount: o.amount_pence,
              product_data: { name: l!.title },
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: o.commission_pence,
          transfer_data: { destination: seller.stripe_account_id },
          metadata: { order_id: id },
        },
        success_url: `${process.env.APP_URL}/account?notice=Payment+submitted.+Your+order+updates+after+Stripe+confirms+payment.`,
        cancel_url: `${process.env.APP_URL}/account?notice=Checkout+cancelled.+Resume+your+order+or+wait+for+reservation+expiry.`,
        expires_at: expires,
      },
      { idempotencyKey: `checkout-${id}` },
    );
    const saved = await a
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", id)
      .eq("status", "pending");
    if (saved.error) throw saved.error;
    await client
      .from("analytics_events")
      .insert({ user_id: user.id, event: "checkout_started" });
    return NextResponse.redirect(session.url!, 303);
  } catch (e) {
    return failure(e);
  }
}
