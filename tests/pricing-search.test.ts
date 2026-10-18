import { describe, it, expect } from "vitest";
import { bundlePrice, poundsToPence } from "../lib/pricing";
import { searchFilters, discoveryLink } from "../lib/search";
import { listingSchema } from "../lib/domain";
describe("Transparent bundle prices", () => {
  it("shows the same fee and proceeds for an agreed price", () =>
    expect(bundlePrice(2000, 8)).toEqual({
      total: 2000,
      fee: 200,
      seller: 1800,
      perPiece: 250,
    }));
  it("rounds the fee once, in integer pence", () =>
    expect(bundlePrice(1235, 3)?.seller).toBe(1111));
  it.each([
    [0, 5],
    [100, 0],
    [100, 101],
    [1000000, 2],
    [100, 1.5],
    [NaN, 5],
  ])("rejects invalid price or quantity %s %s", (p, q) =>
    expect(bundlePrice(p, q)).toBeNull(),
  );
  it("does not round an invalid sub-penny input into a valid price", () =>
    expect(poundsToPence("12.345")).toBeNull());
  it("parses a real decimal price as integer pence", () =>
    expect(poundsToPence("19.99")).toBe(1999));
});
describe("Useful and bounded discovery", () => {
  it("preserves compatible filters when picking another size", () => {
    const url = discoveryLink(
      { brand: "Mini & Me", max_price: "20" },
      { size: "2–3 years", category: "Kids" },
    );
    expect(url).toContain("brand=Mini+%26+Me");
    expect(url).toContain("max_price=20");
    expect(url.endsWith("#discover")).toBe(true);
  });
  it("rejects malformed or duplicated URL values", () =>
    expect(
      searchFilters({
        sort: "sql",
        size: ["a", "b"],
        max_price: "NaN",
        q: "  winter ",
        extra: "ignored",
      }),
    ).toEqual({ q: "winter" }));
  it("recognizes server-side price-per-piece sorting", () =>
    expect(searchFilters({ sort: "per_piece" })).toEqual({
      sort: "per_piece",
    }));
});
const valid = {
  title: "Summer clothing bundle",
  description: "Cotton tops, with all wear and marks described.",
  category: "Kids",
  size: "2–3",
  brand: "Mixed",
  condition: "Good",
  quantity: 3,
  price_pence: 1500,
  location: "Bath",
  pickup: true,
  photos: ["00000000-0000-4000-8000-000000000001"],
  verified: true,
  items: [
    {
      name: "T-shirts",
      size: "2–3",
      brand: "Mixed",
      condition: "Good",
      quantity: 3,
      notes: "Small mark",
    },
  ],
};
describe("Detailed bundle contents", () => {
  it("requires an item breakdown for new listings", () =>
    expect(listingSchema.safeParse({ ...valid, items: [] }).success).toBe(
      false,
    ));
  it("refuses a total that differs from the detailed quantity", () =>
    expect(listingSchema.safeParse({ ...valid, quantity: 4 }).success).toBe(
      false,
    ));
  it("requires a real size and brand for every group", () =>
    expect(
      listingSchema.safeParse({
        ...valid,
        items: [{ ...valid.items[0], size: "", brand: "" }],
      }).success,
    ).toBe(false));
});
