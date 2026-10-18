import { configured } from "@/lib/supabase";
import { signIn, signUp, resetPassword } from "./actions";
export default async function Auth({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const p = await searchParams;
  return (
    <main className="page narrow">
      <div className="eyebrow">YOUR NEXT CHAPTER</div>
      <h1>Welcome to Rewear.</h1>
      <p className="muted">A little community for clothes with more to give.</p>
      {!configured() ? (
        <div className="notice">
          Accounts are not connected yet. Add the Supabase environment variables
          and apply the database migration to enable sign up.
        </div>
      ) : (
        <>
          <div className="notice">
            Verify your email before signing in. Use a unique password with at
            least 12 characters.
          </div>
          {p.error && (
            <p role="alert" className="notice error">
              {p.error}
            </p>
          )}
          {p.notice && (
            <p role="status" className="notice">
              {p.notice}
            </p>
          )}
          <form className="stack panel">
            <label>
              Your name
              <input name="display_name" maxLength={80} autoComplete="name" />
            </label>
            <label>
              Email
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                required
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="current-password"
              />
            </label>
            <button className="button" formAction={signIn}>
              Sign in →
            </button>
            <button className="button light" formAction={signUp}>
              Create an account
            </button>
          </form>
          <details className="panel">
            <summary>Forgot your password?</summary>
            <form action={resetPassword} className="stack">
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </label>
              <button className="button small">Email a reset link</button>
            </form>
          </details>
        </>
      )}
    </main>
  );
}
