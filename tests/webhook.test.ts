import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  admin: () => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ single: mocks.single }) }),
      update: () => ({ eq: mocks.update }),
    }),
  }),
}));
import { POST } from "../app/api/stripe/webhook/route";
import { stripe } from "../lib/payments";
const secret = "whsec_test_fixture";
const sdk = new Stripe("sk_test_fixture");
function request(payload: object, valid = true) {
  const body = JSON.stringify(payload);
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": valid
        ? sdk.webhooks.generateTestHeaderString({ payload: body, secret })
        : "t=1,v1=forged",
    },
  });
}
const event = {
  id: "evt_fixture",
  object: "event",
  type: "checkout.session.completed",
  livemode: false,
  data: {
    object: {
      id: "cs_fixture",
      payment_status: "paid",
      amount_total: 1200,
      currency: "gbp",
      payment_intent: "pi_fixture",
      metadata: { order_id: "00000000-0000-4000-8000-000000000010" },
    },
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  mocks.single.mockResolvedValue({ data: { amount_pence: 1200 }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});
describe("Signed payment webhook", () => {
  it("rejects forged signatures before touching the database", async () => {
    expect((await POST(request(event, false))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects missing signatures", async () =>
    expect(
      (
        await POST(
          new NextRequest("http://localhost:3000/api/stripe/webhook", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(400));
  it("applies a verified matching payment through the transactional database function", async () => {
    expect((await POST(request(event))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "apply_payment_event",
      expect.objectContaining({
        p_event: "evt_fixture",
        p_session: "cs_fixture",
        p_intent: "pi_fixture",
        p_paid: true,
      }),
    );
  });
  it("does not mark an unpaid checkout as paid", async () => {
    const e = {
      ...event,
      data: { object: { ...event.data.object, payment_status: "unpaid" } },
    };
    expect((await POST(request(e))).status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects a mismatched total", async () => {
    mocks.single.mockResolvedValue({
      data: { amount_pence: 5000 },
      error: null,
    });
    expect((await POST(request(event))).status).toBe(500);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not process live-mode events", async () => {
    expect((await POST(request({ ...event, livemode: true }))).status).toBe(
      500,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("returns a retryable failure if database application fails", async () => {
    mocks.rpc.mockResolvedValue({ error: new Error("Database unavailable") });
    expect((await POST(request(event))).status).toBe(500);
  });
  it("refuses live Stripe API keys", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_fixture";
    expect(() => stripe()).toThrow(/test mode/);
  });
});
