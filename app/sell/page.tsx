import { configured, db } from "@/lib/supabase";
import Link from "next/link";
import SellForm from "./sell-form";
export const dynamic = "force-dynamic";
export default async function Sell() {
  let signed = false;
  if (configured()) {
    const c = await db();
    const {
      data: { user },
    } = await c.auth.getUser();
    signed = !!user;
  }
  return (
    <main className="page narrow">
      <div className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</div>
      <h1>A bundle of possibilities.</h1>
      <p className="muted">
        One listing. A whole new chapter for their outgrown favourites.
      </p>
      {signed ? (
        <SellForm />
      ) : (
        <div className="panel">
          <h2>Let’s start with you.</h2>
          <p>
            Sign in to upload photos and publish a real bundle. Your town is
            public; your address stays private.
          </p>
          <Link className="button" href="/auth">
            Sign in or create an account →
          </Link>
        </div>
      )}
    </main>
  );
}
