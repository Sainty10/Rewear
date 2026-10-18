import Link from "next/link";
import { notFound } from "next/navigation";
import { configured, db } from "@/lib/supabase";
import { money } from "@/lib/inventory";
import { listingPhotos } from "@/lib/photos";
export const dynamic = "force-dynamic";
export default async function Listing({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured()) notFound();
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const c = await db();
  const { data: l } = await c
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (!l || l.status === "removed") notFound();
  const {
    data: { user },
  } = await c.auth.getUser();
  const { data: seller } = await c
    .from("profiles")
    .select("id,display_name,bio,charges_enabled")
    .eq("id", l.seller_id)
    .single();
  const photos = await listingPhotos(l.photos);
  if (user)
    await c
      .from("analytics_events")
      .insert({ user_id: user.id, event: "listing_view" });
  return (
    <main className="page">
      <Link className="text-link" href="/">
        ← Back to discovery
      </Link>
      <div className="detail panel">
        <div>
          {photos.map((src, i) => (
            <img key={src} src={src} alt={`${l.title}, photo ${i + 1}`} />
          ))}
        </div>
        <div>
          <div className="eyebrow">
            {l.category} · {l.quantity} PIECES
          </div>
          <h1>{l.title}</h1>
          <strong className="price">{money(l.price_pence)}</strong>
          <p className="muted">Entire bundle · No shipping charge included</p>
          <div className="facts">
            {[
              ["Size", l.size],
              ["Condition", l.condition],
              ["Brand", l.brand],
              ["Town", l.location],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                {v}
              </div>
            ))}
          </div>
          <p className="pre-wrap">{l.description}</p>
          <Link className="text-link" href={`/shop/${seller?.id}`}>
            From {seller?.display_name} →
          </Link>
          <div className="notice">
            {l.status === "active"
              ? "Seller-verified listing. Check all details and ask questions before buying."
              : `This bundle is ${l.status}.`}
          </div>
          {user && user.id !== l.seller_id && l.status === "active" ? (
            <>
              <form action="/api/checkout" method="post" className="stack">
                <input type="hidden" name="listing_id" value={id} />
                <label>
                  Delivery
                  <select name="delivery">
                    <option disabled={!l.pickup} value="pickup">
                      Local pickup{!l.pickup ? " (not offered)" : ""}
                    </option>
                    <option disabled value="shipping">
                      Shipping — coming after provider validation
                    </option>
                  </select>
                </label>
                <button
                  className="button"
                  disabled={!seller?.charges_enabled || !l.pickup}
                >
                  Checkout with Stripe · test mode →
                </button>
              </form>
              {!seller?.charges_enabled && (
                <small>Seller payment onboarding is incomplete.</small>
              )}
              <form className="inline-form" action="/api/actions" method="post">
                <input type="hidden" name="action" value="offer" />
                <input type="hidden" name="listing_id" value={id} />
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  max={l.price_pence / 100}
                  required
                  placeholder="Offer £"
                  aria-label="Offer amount"
                />
                <button className="button small">Make an offer</button>
              </form>
              <form action="/api/actions" method="post">
                <input type="hidden" name="action" value="favorite" />
                <input type="hidden" name="listing_id" value={id} />
                <button className="button light">♡ Save this bundle</button>
              </form>
            </>
          ) : !user ? (
            <Link className="button" href="/auth">
              Sign in to save, offer or buy
            </Link>
          ) : null}
          <div className="notice">
            For pickup, meet in a busy public place during daylight. Keep
            conversations here. Never send payment outside checkout or disclose
            children’s personal details.
          </div>
          {user && (
            <details>
              <summary>Report this listing</summary>
              <form action="/api/actions" method="post" className="stack">
                <input type="hidden" name="action" value="report" />
                <input type="hidden" name="listing_id" value={id} />
                <label>
                  What should we review?
                  <textarea
                    name="reason"
                    minLength={10}
                    maxLength={2000}
                    required
                  />
                </label>
                <button className="button small">Send report</button>
              </form>
            </details>
          )}
        </div>
      </div>
    </main>
  );
}
