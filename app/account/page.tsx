import Link from "next/link";
import MFA from "./mfa";
import { configured, db } from "@/lib/supabase";
import { money } from "@/lib/inventory";
import { signOut } from "@/app/auth/actions";
export const dynamic = "force-dynamic";
const orderFields =
  "id,listing_id,buyer_id,seller_id,amount_pence,commission_pence,delivery,status,tracking_url,created_at,paid_at,completed_at";
function Hidden({ action }: { action: string }) {
  return <input type="hidden" name="action" value={action} />;
}
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  if (!configured())
    return (
      <main className="page narrow">
        <h1>Your Rewear.</h1>
        <div className="panel">
          <p>
            Connect Supabase to create an account, manage your wardrobe and save
            your searches.
          </p>
          <Link className="button" href="/auth">
            Account setup →
          </Link>
        </div>
      </main>
    );
  const c = await db();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user)
    return (
      <main className="page narrow">
        <h1>Make yourself at home.</h1>
        <p>Sign in to see your bundles, messages, orders and saved searches.</p>
        <Link className="button" href="/auth">
          Sign in →
        </Link>
      </main>
    );
  const p = await searchParams;
  const [
    { data: profile },
    { data: listings },
    { data: orders },
    { data: favorites },
    { data: searches },
    { data: alerts },
    { data: offers },
    { data: messages },
    { data: role },
  ] = await Promise.all([
    c
      .from("profiles")
      .select("display_name,bio,town,charges_enabled")
      .eq("id", user.id)
      .single(),
    c
      .from("listings")
      .select("id,title,status,price_pence")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    c
      .from("orders")
      .select(orderFields)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    c.from("favorites").select("listing_id,listings(id,title,price_pence)"),
    c.from("saved_searches").select("*"),
    c
      .from("alerts")
      .select("id,created_at,listings(id,title)")
      .order("created_at", { ascending: false })
      .limit(30),
    c
      .from("offers")
      .select(
        "id,buyer_id,amount_pence,status,listing_id,listings(title,seller_id)",
      )
      .order("created_at", { ascending: false }),
    c
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(300),
    c.rpc("is_admin"),
  ]);
  return (
    <main className="page">
      <div className="eyebrow">YOUR LITTLE CORNER</div>
      <h1>Hello, {profile?.display_name}.</h1>
      <div className="tabs">
        <a href="#orders">Orders & messages</a>
        <a href="#wardrobe">Your wardrobe</a>
        <a href="#saved">Saved finds</a>
        <a href="#profile">Profile</a>
        {role && <Link href="/admin">Administration</Link>}
        <form action={signOut}>
          <button>Sign out</button>
        </form>
      </div>
      {p.notice && (
        <div className="notice" role="status">
          {p.notice}
        </div>
      )}
      {p.error && (
        <div className="notice error" role="alert">
          {p.error}
        </div>
      )}
      <section className="panel">
        <h2>Get ready to sell</h2>
        <p>
          {profile?.charges_enabled
            ? "Stripe has enabled payments and payouts on your account."
            : "Complete Stripe’s identity and payout checks before buyers can check out."}
        </p>
        <div className="inline-form">
          <form action="/api/connect" method="post">
            <button className="button small">
              {profile?.charges_enabled
                ? "Update seller details"
                : "Set up Stripe seller account"}{" "}
              →
            </button>
          </form>
          <form action="/api/payouts" method="post">
            <button className="button light small">
              Payouts & Stripe dashboard →
            </button>
          </form>
        </div>
        <small className="muted">
          Test mode only. Stripe controls payout timing and eligibility. Rewear
          commission is 10%; your order history shows the exact calculation.
        </small>
      </section>
      <section className="panel" id="orders">
        <h2>Orders & conversations</h2>
        {!orders?.length && (
          <p className="muted">Your first order will appear here.</p>
        )}
        {orders?.map((o) => (
          <article className="panel" key={o.id}>
            <div className="row">
              <div>
                <Link href={`/listing/${o.listing_id}`}>
                  <strong>
                    {o.seller_id === user.id ? "Sale" : "Purchase"} ·{" "}
                    {o.id.slice(0, 8)} →
                  </strong>
                </Link>
                <p>
                  {money(o.amount_pence)} · {o.delivery} ·{" "}
                  <span className="badge">{o.status}</span>
                </p>
                <small>
                  Commission {money(o.commission_pence)} · Seller proceeds{" "}
                  {money(o.amount_pence - o.commission_pence)} before
                  adjustments
                </small>
              </div>
              {o.tracking_url && (
                <a href={o.tracking_url} rel="noreferrer">
                  Track parcel →
                </a>
              )}
            </div>
            {o.delivery === "pickup" && (
              <div className="notice">
                Agree a public meeting place here. Do not share home addresses
                or children’s details. Confirm receipt only after you have
                checked the bundle.
              </div>
            )}
            {messages
              ?.filter((m) => m.order_id === o.id)
              .map((m) => (
                <div className="message" key={m.id}>
                  <small>
                    {m.sender_id === user.id ? "You" : "Other member"} ·{" "}
                    {new Date(m.created_at).toLocaleDateString("en-GB")}
                  </small>
                  <p className="pre-wrap">{m.body}</p>
                </div>
              ))}
            {o.status !== "expired" && (
              <form className="inline-form" method="post" action="/api/actions">
                <Hidden action="message" />
                <input type="hidden" name="order_id" value={o.id} />
                <input
                  required
                  name="body"
                  minLength={1}
                  maxLength={2000}
                  aria-label="Order message"
                  placeholder="Write a message…"
                />
                <button className="button small">Send</button>
              </form>
            )}
            <div className="inline-form">
              {o.buyer_id === user.id && o.status === "pending" && (
                <form method="post" action="/api/checkout">
                  <input type="hidden" name="order_id" value={o.id} />
                  <button className="button small">Resume checkout</button>
                </form>
              )}
              {o.buyer_id === user.id &&
                ["paid", "shipped"].includes(o.status) && (
                  <form method="post" action="/api/actions">
                    <Hidden action="complete" />
                    <input type="hidden" name="id" value={o.id} />
                    <button className="button small">
                      Confirm bundle received
                    </button>
                  </form>
                )}
              {o.seller_id === user.id &&
                ["paid", "shipped", "completed", "disputed"].includes(
                  o.status,
                ) && (
                  <form method="post" action="/api/refund">
                    <input type="hidden" name="id" value={o.id} />
                    <button className="button light small">
                      Issue full refund
                    </button>
                  </form>
                )}
            </div>
            {["paid", "shipped", "completed", "disputed"].includes(
              o.status,
            ) && (
              <details>
                <summary>There’s a problem with this order</summary>
                <form className="stack" method="post" action="/api/actions">
                  <Hidden action="dispute" />
                  <input type="hidden" name="order_id" value={o.id} />
                  <label>
                    Tell us what happened
                    <textarea
                      name="reason"
                      minLength={10}
                      maxLength={2000}
                      required
                    />
                  </label>
                  <button className="button small">Open a dispute</button>
                </form>
              </details>
            )}
          </article>
        ))}
      </section>
      <section id="wardrobe" className="panel">
        <div className="section-heading">
          <h2>Your wardrobe</h2>
          <Link href="/sell" className="button small">
            + New bundle
          </Link>
        </div>
        {!listings?.length && (
          <p className="muted">
            A little clear-out could start something good.
          </p>
        )}
        {listings?.map((l) => (
          <div className="row" key={l.id}>
            <Link href={`/listing/${l.id}`}>
              <strong>{l.title}</strong>
              <p>
                {money(l.price_pence)} · {l.status}
              </p>
            </Link>
            {l.status === "active" && (
              <form action="/api/actions" method="post">
                <Hidden action="remove" />
                <input type="hidden" name="listing_id" value={l.id} />
                <button>Withdraw</button>
              </form>
            )}
          </div>
        ))}
        <h3>Offers</h3>
        {offers?.length ? (
          offers.map((o: any) => (
            <div className="row" key={o.id}>
              <div>
                <Link href={`/listing/${o.listing_id}`}>
                  {o.listings?.title}
                </Link>
                <p>
                  {money(o.amount_pence)} · {o.status}
                </p>
              </div>
              {o.listings?.seller_id === user.id && o.status === "pending" && (
                <form method="post" action="/api/actions">
                  <Hidden action="accept_offer" />
                  <input type="hidden" name="id" value={o.id} />
                  <button className="button small">Accept offer</button>
                </form>
              )}
            </div>
          ))
        ) : (
          <p className="muted">No offers yet.</p>
        )}
      </section>
      <section id="saved" className="panel">
        <h2>Saved finds & new arrivals</h2>
        {favorites?.map((f: any) => (
          <div className="row" key={f.listing_id}>
            <Link href={`/listing/${f.listing_id}`}>
              {f.listings?.title ?? "Listing unavailable"}
            </Link>
            <form action="/api/actions" method="post">
              <Hidden action="unfavorite" />
              <input type="hidden" name="listing_id" value={f.listing_id} />
              <button>Remove favorite</button>
            </form>
          </div>
        ))}
        <h3>New inventory alerts</h3>
        <p className="muted">
          In-app alerts appear when a newly published bundle matches a saved
          search. Email and push delivery are not enabled.
        </p>
        {alerts?.length ? (
          alerts.map((a: any) => (
            <Link
              className="row"
              href={`/listing/${a.listings?.id}`}
              key={a.id}
            >
              {a.listings?.title ?? "Bundle no longer available"} →
            </Link>
          ))
        ) : (
          <p>No matches yet.</p>
        )}
        <h3>Your saved searches</h3>
        {searches?.map((s) => (
          <div className="row" key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <p>
                {Object.entries(s.filters)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </p>
            </div>
            <form method="post" action="/api/actions">
              <Hidden action="delete_search" />
              <input type="hidden" name="id" value={s.id} />
              <button>Delete</button>
            </form>
          </div>
        ))}
        <form action="/api/actions" method="post" className="stack">
          <Hidden action="search" />
          <label>
            Search name
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Next winter’s wardrobe"
            />
          </label>
          <div className="form-grid">
            {[
              ["size", "Size"],
              ["brand", "Brand"],
              ["category", "Category"],
              ["condition", "Condition"],
              ["location", "Town"],
              ["max_price", "Maximum price in pence"],
            ].map(([n, label]) => (
              <label key={n}>
                {label}
                <input
                  name={n}
                  maxLength={80}
                  type={n === "max_price" ? "number" : "text"}
                  min={100}
                />
              </label>
            ))}
          </div>
          <button className="button">Save search & enable in-app alerts</button>
        </form>
      </section>
      <MFA />
      <section id="profile" className="panel">
        <h2>Your storefront</h2>
        <Link className="text-link" href={`/shop/${user.id}`}>
          View public storefront →
        </Link>
        <form action="/api/actions" method="post" className="stack">
          <Hidden action="profile" />
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={profile?.display_name}
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label>
            Bio
            <textarea name="bio" defaultValue={profile?.bio} maxLength={500} />
          </label>
          <label>
            Town only
            <input name="town" defaultValue={profile?.town} maxLength={80} />
          </label>
          <button className="button">Save profile</button>
        </form>
      </section>
    </main>
  );
}
