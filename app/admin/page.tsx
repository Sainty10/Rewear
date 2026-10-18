import { configured, db, admin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { money } from "@/lib/inventory";
import { marketplaceMetrics } from "@/lib/metrics";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Admin() {
  if (!configured()) notFound();
  const c = await db();
  const { data: role } = await c.rpc("is_admin");
  if (!role) notFound();
  const a = admin();
  const results = await Promise.all([
    a
      .from("orders")
      .select(
        "id,buyer_id,seller_id,status,amount_pence,commission_pence,created_at,completed_at",
      ),
    a.from("listings").select("id,title,seller_id,status,verified,created_at"),
    a.from("analytics_events").select("user_id,event"),
    a.from("acquisition_costs").select("amount_pence"),
    a.from("order_costs").select("*"),
    a.from("reports").select("*").eq("status", "open"),
    a.from("disputes").select("*").eq("status", "open"),
  ]);
  if (results.some((r) => r.error))
    throw new Error("Could not load marketplace metrics");
  const [orders, listings, events, acquisition, costs, reports, disputes] =
    results.map((r) => r.data ?? []);
  const paid = orders.filter((o) =>
    ["paid", "shipped", "completed", "disputed"].includes(o.status),
  );
  const m = marketplaceMetrics(
    orders as any,
    listings as any,
    events as any,
    acquisition.reduce((s, x) => s + x.amount_pence, 0),
    costs.reduce(
      (s, x) =>
        s + x.processing_pence + x.shipping_subsidy_pence + x.other_pence,
      0,
    ),
    orders.filter((o) =>
      ["paid", "shipped", "completed", "disputed", "refunded"].includes(
        o.status,
      ),
    ).length > 0 &&
      orders
        .filter((o) =>
          ["paid", "shipped", "completed", "disputed", "refunded"].includes(
            o.status,
          ),
        )
        .every((o) => costs.some((c) => c.order_id === o.id)),
  );
  const percent = (v: number | null) =>
    v === null ? "No data" : `${(v * 100).toFixed(1)}%`;
  const metrics = [
    ["Active sellers", m.activeSellers],
    ["Qualified listings", m.qualifiedListings],
    ["Buyer conversion", percent(m.buyerConversion)],
    ["Completed orders", m.completedOrders],
    ["Refunds", m.refunds],
    ["Refund rate", percent(m.refundRate)],
    ["Repeat purchase rate", percent(m.repeatPurchase)],
    [
      "Acquisition cost",
      m.acquisitionCost === null ? "Not recorded" : money(m.acquisitionCost),
    ],
    [
      "Contribution margin",
      m.contributionMargin === null
        ? "Costs incomplete"
        : money(m.contributionMargin),
    ],
  ];
  return (
    <main className="page">
      <div className="eyebrow">MARKETPLACE OPERATIONS</div>
      <h1>Rewear overview.</h1>
      <div className="notice">
        Test-mode data only. Metrics are all-time and based on recorded events.
        No synthetic activity is included.
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <details className="panel">
        <summary>Metric definitions & limitations</summary>
        <p>
          Active sellers have at least one active bundle. Qualified listings are
          active seller-verified bundles; verification is not a platform quality
          guarantee. Buyer conversion measures authenticated viewers who
          completed an order, divided by distinct authenticated listing viewers.
          Completed orders require buyer receipt confirmation. Refund rate uses
          paid orders including refunded orders. Repeat purchase rate is the
          share of completed-order buyers with at least two completed orders.
          CAC is recorded acquisition spend divided by completed-order buyers;
          attribution and time windows are not implemented. Contribution margin
          is platform commission on non-refunded paid orders less recorded
          payment, subsidy, other costs and acquisition spend. Record costs for
          every paid order before using it. Test mode figures do not establish
          commercial performance.
        </p>
      </details>
      <section className="panel">
        <h2>Record operating costs</h2>
        <p className="muted">
          Enter actual costs in GBP pence. Order cost entries replace the
          previous entry for that order. Acquisition entries are additive.
        </p>
        <form action="/api/actions" method="post" className="inline-form">
          <input type="hidden" name="action" value="record_acquisition" />
          <input
            name="channel"
            placeholder="Acquisition channel"
            aria-label="Acquisition channel"
            required
            minLength={2}
            maxLength={80}
          />
          <input
            type="number"
            name="amount_pence"
            placeholder="Spend, pence"
            aria-label="Acquisition spend in pence"
            min={0}
            required
          />
          <button className="button small">Record spend</button>
        </form>
        <form action="/api/actions" method="post" className="stack">
          <input type="hidden" name="action" value="record_cost" />
          <label>
            Order ID
            <input name="order_id" required placeholder="Order UUID" />
          </label>
          <div className="form-grid">
            {[
              ["processing_pence", "Payment fees"],
              ["shipping_subsidy_pence", "Shipping subsidy"],
              ["other_pence", "Other variable costs"],
            ].map(([n, label]) => (
              <label key={n}>
                {label} (pence)
                <input type="number" name={n} required min={0} />
              </label>
            ))}
          </div>
          <button className="button small">Save order costs</button>
        </form>
      </section>
      <section className="panel">
        <h2>Reports</h2>
        {reports.length ? (
          reports.map((r) => (
            <article key={r.id} className="panel">
              <Link href={`/listing/${r.listing_id}`}>Review listing →</Link>
              <p className="pre-wrap">{r.reason}</p>
              <form action="/api/actions" method="post" className="inline-form">
                <input type="hidden" name="listing_id" value={r.listing_id} />
                <button className="button small" name="action" value="remove">
                  Remove active listing
                </button>
                <input type="hidden" name="id" value={r.id} />
                <button name="action" value="resolve_report">
                  Resolve report
                </button>
              </form>
            </article>
          ))
        ) : (
          <p>No open reports.</p>
        )}
      </section>
      <section className="panel">
        <h2>Disputes</h2>
        {disputes.length ? (
          disputes.map((d) => (
            <article className="panel" key={d.id}>
              <p>Order {d.order_id}</p>
              <p className="pre-wrap">{d.reason}</p>
              <form action="/api/refund" method="post">
                <input type="hidden" name="id" value={d.order_id} />
                <button className="button small">Issue full refund</button>
              </form>
              <form action="/api/actions" method="post" className="inline-form">
                <input type="hidden" name="action" value="resolve_dispute" />
                <input type="hidden" name="id" value={d.id} />
                <button>Mark dispute resolved</button>
              </form>
            </article>
          ))
        ) : (
          <p>No open disputes.</p>
        )}
      </section>
    </main>
  );
}
