import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/payments";
import { admin } from "@/lib/supabase";
export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET)
      return new NextResponse("Webhook configuration missing", { status: 400 });
    event = stripe().webhooks.constructEvent(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }
  try {
    if (event.livemode) throw new Error("Only test events accepted");
    const a = admin();
    if (event.type === "account.updated") {
      const account = event.data.object;
      const { error } = await a
        .from("profiles")
        .update({
          charges_enabled: account.charges_enabled && account.payouts_enabled,
        })
        .eq("stripe_account_id", account.id);
      if (error) throw error;
    }
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.expired",
      ].includes(event.type)
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const paid = session.payment_status === "paid";
      if (event.type !== "checkout.session.expired" && !paid)
        return NextResponse.json({ received: true });
      const id = session.metadata?.order_id;
      if (!id) throw new Error("Missing order");
      const { data: o, error: read } = await a
        .from("orders")
        .select("amount_pence")
        .eq("id", id)
        .single();
      if (
        read ||
        session.amount_total !== o?.amount_pence ||
        session.currency !== "gbp"
      )
        throw new Error("Payment amount mismatch");
      const { error } = await a.rpc("apply_payment_event", {
        p_event: event.id,
        p_order: id,
        p_session: session.id,
        p_intent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        p_paid: paid,
      });
      if (error) throw error;
    }
    if (event.type === "charge.refunded") {
      const c = event.data.object;
      if (c.refunded && typeof c.payment_intent === "string") {
        const { error } = await a.rpc("apply_refund_event", {
          p_event: event.id,
          p_intent: c.payment_intent,
        });
        if (error) throw error;
      }
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(
      "Webhook processing failed",
      event.id,
      e instanceof Error ? e.message : "",
    );
    return new NextResponse("Retry processing", { status: 500 });
  }
}
