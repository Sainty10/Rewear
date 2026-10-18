import { NextRequest, NextResponse } from "next/server";
import { authenticated } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
import { z } from "zod";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { client } = await authenticated();
    const body = await req.json();
    if (body.action === "enroll") {
      const { data: factors, error: listError } =
        await client.auth.mfa.listFactors();
      if (listError) throw listError;
      for (const f of factors.all.filter((f) => f.status === "unverified"))
        await client.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Rewear authenticator",
      });
      if (error) throw error;
      return NextResponse.json(
        { id: data.id, qr_code: data.totp.qr_code },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    let id = body.factor_id;
    if (body.action === "verify_existing") {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw error;
      id = data.totp.find((f) => f.status === "verified")?.id;
    }
    const factorId = z.string().uuid().parse(id);
    const code = z
      .string()
      .regex(/^\d{6}$/)
      .parse(body.code);
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw new Error("Authenticator verification failed");
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
