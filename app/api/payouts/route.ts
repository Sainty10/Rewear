import { NextRequest, NextResponse } from "next/server";
import { authenticated, admin } from "@/lib/supabase";
import { stripe } from "@/lib/payments";
import { sameOrigin, failure } from "@/lib/http";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { user } = await authenticated();
    const { data: p } = await admin()
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();
    if (!p?.stripe_account_id)
      throw new Error("Complete seller onboarding first");
    const link = await stripe().accounts.createLoginLink(p.stripe_account_id);
    return NextResponse.redirect(link.url, 303);
  } catch (e) {
    return failure(e);
  }
}
