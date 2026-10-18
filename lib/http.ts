import { NextRequest, NextResponse } from "next/server";
export function sameOrigin(req: NextRequest) {
  const expected = new URL(process.env.APP_URL || req.url).origin;
  if (req.headers.get("origin") !== expected)
    throw new Error("Request origin is not allowed");
}
export function failure(e: unknown, status = 400) {
  console.error(e instanceof Error ? e.message : "Request failed");
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Request failed" },
    { status },
  );
}
