import Stripe from "stripe";
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_"))
    throw new Error("Stripe Connect test mode is not configured");
  return new Stripe(key, { maxNetworkRetries: 2 });
}
