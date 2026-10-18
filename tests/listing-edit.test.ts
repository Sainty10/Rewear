import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({
  eq: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  authenticated: async () => ({
    client: { rpc: state.rpc },
    user: { id: "actual-seller" },
  }),
  admin: () => ({ from: state.from }),
}));
import { POST } from "../app/api/actions/route";
const body = {
  action: "update_listing",
  listing_id: "00000000-0000-4000-8000-000000000011",
  title: "Cotton clothing bundle",
  description: "Two cotton tops with any marks clearly disclosed.",
  category: "Kids",
  size: "2–3",
  brand: "Mixed",
  condition: "Good",
  quantity: 2,
  price_pence: 1000,
  location: "Bath",
  pickup: true,
  photos: ["00000000-0000-4000-8000-000000000001"],
  verified: true,
  items: [
    {
      name: "Cotton tops",
      size: "2–3",
      brand: "Mixed",
      condition: "Good",
      quantity: 2,
      notes: "",
    },
  ],
};
function request(patch: object = {}) {
  return new NextRequest("http://localhost:3000/api/actions", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, ...patch }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "http://localhost:3000";
  const chain = { eq: state.eq, single: state.single };
  state.eq.mockReturnValue(chain);
  const selected = { select: () => chain };
  state.update.mockReturnValue({ ...selected, eq: state.eq });
  state.eq.mockReturnValue({ ...chain, select: () => chain });
  state.from.mockReturnValue({ update: state.update });
  state.single.mockResolvedValue({
    data: { id: body.listing_id },
    error: null,
  });
  state.rpc.mockResolvedValue({ error: null });
});
describe("Owner-only active listing edits", () => {
  it("always scopes the update to the authenticated seller and active status", async () => {
    const response = await POST(
      request({ seller_id: "someone-else", status: "sold" }),
    );
    expect(response.status).toBe(200);
    expect(state.eq).toHaveBeenCalledWith("seller_id", "actual-seller");
    expect(state.eq).toHaveBeenCalledWith("status", "active");
    expect(state.update.mock.calls[0][0]).not.toHaveProperty("seller_id");
    expect(state.update.mock.calls[0][0]).not.toHaveProperty("status");
  });
  it("does not claim success if ownership or reservation filters reject the update", async () => {
    state.single.mockResolvedValue({
      data: null,
      error: { message: "Listing is not editable" },
    });
    expect((await POST(request())).status).toBe(400);
  });
  it("rejects edits with an inconsistent item count before mutation", async () => {
    expect((await POST(request({ quantity: 5 }))).status).toBe(400);
    expect(state.update).not.toHaveBeenCalled();
  });
});
