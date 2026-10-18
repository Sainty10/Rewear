import { updatePassword } from "@/app/auth/actions";
import { configured, db } from "@/lib/supabase";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Password({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!configured()) redirect("/auth");
  const c = await db();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) redirect("/auth");
  const p = await searchParams;
  return (
    <main className="page narrow">
      <h1>Set a new password.</h1>
      {p.error && (
        <p role="alert" className="notice error">
          {p.error}
        </p>
      )}
      <form action={updatePassword} className="stack panel">
        <label>
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <button className="button">
          Update password & sign out all sessions
        </button>
      </form>
    </main>
  );
}
