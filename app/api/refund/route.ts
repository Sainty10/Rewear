import { NextRequest, NextResponse } from "next/server";
import { authenticated, admin } from "@/lib/supabase";
import { stripe } from "@/lib/payments";
import { sameOrigin, failure } from "@/lib/http";
import { z } from "zod";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { client, user } = await authenticated();
    const form = await req.formData();
    const id = z.string().uuid().parse(form.get("id"));
    const { data: role } = await client.rpc("is_admin");
    const a = admin();
    const { data: o } = await a
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (
      !o ||
      (!role && o.seller_id !== user.id) ||
      !["paid", "shipped", "completed", "disputed"].includes(o.status) ||
      !o.stripe_payment_intent
    )
      throw new Error("Refund not permitted");
    await stripe().refunds.create(
      {
        payment_intent: o.stripe_payment_intent,
        reverse_transfer: true,
        refund_application_fee: true,
      },
      { idempotencyKey: `full-refund-${o.id}` },
    );
    return NextResponse.redirect(
      new URL(
        "/account?notice=Refund+submitted.+Status+updates+after+Stripe+confirmation.",
        req.url,
      ),
      303,
    );
  } catch (e) {
    return failure(e);
  }
}
