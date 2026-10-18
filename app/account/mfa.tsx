"use client";
import { useState } from "react";
export default function MFA() {
  const [factor, setFactor] = useState<{ id: string; qr_code: string } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function call(action: string, code?: string) {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, factor_id: factor?.id, code }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (action === "enroll") setFactor(data);
      else {
        setFactor(null);
        setNotice(
          "Two-factor verification complete. Reload to access administration.",
        );
        window.location.reload();
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Two-factor authentication</h2>
      <p>
        Administrators must verify a code from their authenticator app before
        opening the dashboard.
      </p>
      {!factor ? (
        <>
          <button
            disabled={busy}
            className="button small"
            onClick={() => call("enroll")}
          >
            Set up authenticator
          </button>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              call(
                "verify_existing",
                String(new FormData(e.currentTarget).get("code")),
              );
            }}
          >
            <input
              name="code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="Existing authenticator code"
              aria-label="Existing authenticator code"
            />
            <button className="button small" disabled={busy}>
              Verify existing authenticator
            </button>
          </form>
        </>
      ) : (
        <>
          <img
            src={factor.qr_code}
            alt="Scan with your authenticator app"
            width={200}
            height={200}
          />
          <p>
            Scan this private QR code with your authenticator. Never share it.
          </p>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              call("verify", String(new FormData(e.currentTarget).get("code")));
            }}
          >
            <input
              name="code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              aria-label="New authenticator code"
            />
            <button disabled={busy} className="button small">
              Confirm setup
            </button>
          </form>
        </>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </section>
  );
}
