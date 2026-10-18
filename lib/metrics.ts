export type MetricOrder = {
  buyer_id: string;
  seller_id: string;
  status: string;
  amount_pence: number;
  commission_pence: number;
  created_at: string;
  completed_at: string | null;
};
export function marketplaceMetrics(
  orders: MetricOrder[],
  listings: {
    seller_id: string;
    status: string;
    verified: boolean;
    created_at: string;
  }[],
  events: { user_id: string | null; event: string }[],
  acquisition: number,
  costs: number,
  costsComplete: boolean,
) {
  const completed = orders.filter((o) => o.completed_at !== null);
  const refunds = orders.filter((o) => o.status === "refunded");
  const buyers = new Map<string, number>();
  for (const o of completed)
    buyers.set(o.buyer_id, (buyers.get(o.buyer_id) ?? 0) + 1);
  const viewers = new Set(
    events
      .filter((e) => e.event === "listing_view" && e.user_id)
      .map((e) => e.user_id),
  );
  const converted = new Set(
    completed.filter((o) => viewers.has(o.buyer_id)).map((o) => o.buyer_id),
  );
  const live = orders.filter((o) =>
    ["paid", "shipped", "completed", "disputed"].includes(o.status),
  );
  return {
    activeSellers: new Set(
      listings.filter((l) => l.status === "active").map((l) => l.seller_id),
    ).size,
    qualifiedListings: listings.filter(
      (l) => l.verified && l.status === "active",
    ).length,
    buyerConversion: viewers.size ? converted.size / viewers.size : null,
    completedOrders: completed.length,
    refunds: refunds.length,
    refundRate: orders.filter((o) =>
      ["paid", "shipped", "completed", "disputed", "refunded"].includes(
        o.status,
      ),
    ).length
      ? refunds.length /
        orders.filter((o) =>
          ["paid", "shipped", "completed", "disputed", "refunded"].includes(
            o.status,
          ),
        ).length
      : null,
    repeatPurchase: buyers.size
      ? [...buyers.values()].filter((n) => n > 1).length / buyers.size
      : null,
    acquisitionCost:
      buyers.size && acquisition > 0 ? acquisition / buyers.size : null,
    contributionMargin: costsComplete
      ? live.reduce((s, o) => s + o.commission_pence, 0) - costs - acquisition
      : null,
  };
}
