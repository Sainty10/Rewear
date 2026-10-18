import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
export type RecoverableOrder = {
  id: string;
  created_at: string;
  stripe_session_id: string | null;
  amount_pence: number;
  status: string;
};
/** Only call with a server-fetched order after checking ownership/administrator access. */
export async function reconcileOrder(
  s: Stripe,
  database: SupabaseClient,
  order: RecoverableOrder,
  now = Date.now(),
) {
  if (order.status !== "pending")
    return "This order already has a confirmed status.";
  let session: Stripe.Checkout.Session | null = null;
  if (order.stripe_session_id)
    session = await s.checkout.sessions.retrieve(order.stripe_session_id);
  else {
    if (now - new Date(order.created_at).getTime() < 65 * 60 * 1000)
      throw new Error(
        "This checkout may still be starting. Resume payment, or check again after the one-hour reservation has expired.",
      );
    let inspected = 0;
    // Exhaustive pagination is essential. A partial list cannot establish that a session is absent.
    for await (const candidate of s.checkout.sessions.list({
      created: {
        gte: Math.floor(new Date(order.created_at).getTime() / 1000) - 60,
      },
      limit: 100,
    })) {
      if (++inspected > 10000)
        throw new Error(
          "Too many Stripe sessions to reconcile safely. An operator must review this order.",
        );
      if (
        candidate.client_reference_id === order.id ||
        candidate.metadata?.order_id === order.id
      ) {
        session = candidate;
        break;
      }
    }
    if (!session) {
      const { error } = await database.rpc("release_orphan_order", {
        p_order: order.id,
      });
      if (error)
        throw new Error("Could not release the reservation. Please retry.");
      return "No Stripe checkout exists for this expired reservation. The bundle is available again.";
    }
  }
  if (
    session.client_reference_id !== order.id ||
    session.metadata?.order_id !== order.id ||
    session.amount_total !== order.amount_pence ||
    session.currency !== "gbp" ||
    session.livemode
  )
    throw new Error(
      "Stripe checkout does not match this order. Operator review is required.",
    );
  const paid = session.payment_status === "paid";
  if (!paid && session.status !== "expired")
    return "Stripe has not confirmed payment or expiry. Your reservation has been kept.";
  const { error } = await database.rpc("apply_payment_event", {
    p_event: `reconcile_${session.id}_${paid ? "paid" : "expired"}`,
    p_order: order.id,
    p_session: session.id,
    p_intent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null,
    p_paid: paid,
  });
  if (error)
    throw new Error("Payment status could not be saved. Please retry.");
  return paid
    ? "Stripe confirmed your payment. Your order has been updated."
    : "Stripe confirmed checkout expiry. The bundle is available again.";
}
