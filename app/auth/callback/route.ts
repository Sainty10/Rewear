import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { safeNext } from "@/lib/domain";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const c = await db();
    const { error } = await c.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeNext(req.nextUrl.searchParams.get("next")), req.url),
      );
  }
  return NextResponse.redirect(
    new URL("/auth?error=Verification+link+expired", req.url),
  );
}
