import { describe, it, expect } from "vitest";
import {
  commission,
  listingSchema,
  safeNext,
  matchesSearch,
} from "../lib/domain";
import { marketplaceMetrics } from "../lib/metrics";
const valid = {
  title: "Winter clothing bundle",
  description: "A set of winter layers with a small mark on one sleeve.",
  category: "Kids",
  size: "2–3 years",
  brand: "Mixed",
  condition: "Good",
  quantity: 5,
  price_pence: 1200,
  location: "Bristol",
  pickup: true,
  photos: ["00000000-0000-4000-8000-000000000001"],
  verified: true,
};
describe("Seller listing verification", () => {
  it("accepts a complete explicitly verified bundle", () =>
    expect(listingSchema.parse(valid)).toEqual(valid));
  it.each([
    { verified: false },
    { photos: [] },
    { price_pence: 0 },
    { quantity: 0 },
    { quantity: 101 },
    { condition: "Perfect" },
    { category: "Toys" },
    { description: "short" },
  ])("rejects invalid listing %j", (patch) =>
    expect(listingSchema.safeParse({ ...valid, ...patch }).success).toBe(false),
  );
  it("does not accept client controlled seller or status", () =>
    expect(
      listingSchema.parse({ ...valid, seller_id: "victim", status: "sold" }),
    ).not.toHaveProperty("seller_id"));
});
describe("Money and redirects", () => {
  it("calculates commission in integer pence", () =>
    expect(commission(1235)).toEqual({
      total: 1235,
      platform: 124,
      seller: 1111,
    }));
  it.each([0, -1, 123.4, NaN, Infinity])("rejects invalid total %s", (v) =>
    expect(() => commission(v)).toThrow(),
  );
  it.each(["//evil.test", "https://evil.test", "/\\evil.test"])(
    "rejects open redirects %s",
    (v) => expect(safeNext(v)).toBe("/account"),
  );
  it("keeps safe local redirects", () =>
    expect(safeNext("/account")).toBe("/account"));
  it("matches saved searches", () =>
    expect(
      matchesSearch(
        { size: "2–3 years", price_pence: 1200 },
        { size: "2–3", max_price: 1500 },
      ),
    ).toBe(true));
});
describe("Metrics", () => {
  it("does not invent conversion or costs for an empty marketplace", () => {
    const m = marketplaceMetrics([], [], [], 0, 0, false);
    expect(m.buyerConversion).toBeNull();
    expect(m.contributionMargin).toBeNull();
    expect(m.acquisitionCost).toBeNull();
    expect(m.activeSellers).toBe(0);
  });
  it("excludes refunded revenue and counts repeat completed purchases", () => {
    const order = {
      buyer_id: "b",
      seller_id: "s",
      status: "completed",
      amount_pence: 1000,
      commission_pence: 100,
      created_at: "2026-01-01",
      completed_at: "2026-01-02",
    };
    const m = marketplaceMetrics(
      [order, order, { ...order, status: "refunded" }],
      [
        {
          seller_id: "s",
          status: "active",
          verified: true,
          created_at: "2026-01-01",
        },
      ],
      [{ user_id: "b", event: "listing_view" }],
      30,
      20,
      true,
    );
    expect(m.completedOrders).toBe(3);
    expect(m.refunds).toBe(1);
    expect(m.repeatPurchase).toBe(1);
    expect(m.contributionMargin).toBe(150);
    expect(m.buyerConversion).toBe(1);
  });
});
