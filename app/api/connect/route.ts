import { NextRequest, NextResponse } from "next/server";
import { authenticated, admin } from "@/lib/supabase";
import { stripe } from "@/lib/payments";
import { sameOrigin, failure } from "@/lib/http";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { user } = await authenticated();
    const s = stripe();
    const a = admin();
    const { data: p, error } = await a
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    let account = p.stripe_account_id;
    if (!account) {
      const created = await s.accounts.create(
        {
          type: "express",
          country: "GB",
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { user_id: user.id },
        },
        { idempotencyKey: `connect-${user.id}` },
      );
      account = created.id;
      const { error } = await a
        .from("profiles")
        .update({ stripe_account_id: account })
        .eq("id", user.id);
      if (error) throw error;
    }
    const link = await s.accountLinks.create({
      account,
      refresh_url: `${process.env.APP_URL}/account`,
      return_url: `${process.env.APP_URL}/account?notice=Stripe+onboarding+submitted.+Payment+status+updates+after+Stripe+verification.`,
      type: "account_onboarding",
    });
    return NextResponse.redirect(link.url, 303);
  } catch (e) {
    return failure(e);
  }
}
