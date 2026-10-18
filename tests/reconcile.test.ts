import { beforeEach, describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileOrder } from "../lib/reconcile";
const now = Date.parse("2026-10-18T10:00:00Z");
const order = {
  id: "order-test-only",
  created_at: "2026-10-18T08:00:00Z",
  stripe_session_id: "cs_test",
  amount_pence: 2000,
  status: "pending",
};
const session = {
  id: "cs_test",
  client_reference_id: order.id,
  metadata: { order_id: order.id },
  amount_total: 2000,
  currency: "gbp",
  livemode: false,
  payment_status: "paid",
  status: "complete",
  payment_intent: "pi_test",
};
const rpc = vi.fn();
const retrieve = vi.fn();
const list = vi.fn();
const db = { rpc } as unknown as SupabaseClient;
const sdk = { checkout: { sessions: { retrieve, list } } } as unknown as Stripe;
function sessions(values: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const value of values) yield value;
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
  retrieve.mockResolvedValue(session);
  list.mockReturnValue(sessions([]));
});
describe("Authoritative checkout recovery", () => {
  it("confirms a paid order only from the Stripe response", async () => {
    await reconcileOrder(sdk, db, order, now);
    expect(rpc).toHaveBeenCalledWith(
      "apply_payment_event",
      expect.objectContaining({
        p_session: "cs_test",
        p_intent: "pi_test",
        p_paid: true,
      }),
    );
  });
  it("keeps an unpaid open session reserved", async () => {
    retrieve.mockResolvedValue({
      ...session,
      payment_status: "unpaid",
      status: "open",
    });
    expect(await reconcileOrder(sdk, db, order, now)).toMatch(/kept/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("uses a verified expired session to release inventory", async () => {
    retrieve.mockResolvedValue({
      ...session,
      payment_status: "unpaid",
      status: "expired",
      payment_intent: null,
    });
    await reconcileOrder(sdk, db, order, now);
    expect(rpc).toHaveBeenCalledWith(
      "apply_payment_event",
      expect.objectContaining({ p_paid: false }),
    );
  });
  it.each([
    { amount_total: 1 },
    { currency: "usd" },
    { metadata: { order_id: "someone-else" } },
    { client_reference_id: "someone-else" },
    { livemode: true },
  ])("refuses a mismatched checkout %j", async (patch) => {
    retrieve.mockResolvedValue({ ...session, ...patch });
    await expect(reconcileOrder(sdk, db, order, now)).rejects.toThrow(
      /does not match/,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not scan or release an orphan while checkout could still be created", async () => {
    await expect(
      reconcileOrder(
        sdk,
        db,
        {
          ...order,
          created_at: "2026-10-18T09:30:00Z",
          stripe_session_id: null,
        },
        now,
      ),
    ).rejects.toThrow(/starting/);
    expect(list).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("releases an expired orphan only after the list is exhausted", async () => {
    let exhausted = false;
    list.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield {
          ...session,
          client_reference_id: "different",
          metadata: { order_id: "different" },
        };
        exhausted = true;
      },
    });
    rpc.mockImplementation(async () => {
      expect(exhausted).toBe(true);
      return { error: null };
    });
    await reconcileOrder(sdk, db, { ...order, stripe_session_id: null }, now);
    expect(rpc).toHaveBeenCalledWith("release_orphan_order", {
      p_order: order.id,
    });
  });
  it("does not release a reservation if Stripe pagination fails", async () => {
    list.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        throw new Error("Stripe unavailable");
        yield session;
      },
    });
    await expect(
      reconcileOrder(sdk, db, { ...order, stripe_session_id: null }, now),
    ).rejects.toThrow(/unavailable/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("finds and confirms an orphaned paid session instead of releasing it", async () => {
    list.mockReturnValue(sessions([session]));
    await reconcileOrder(sdk, db, { ...order, stripe_session_id: null }, now);
    expect(rpc).toHaveBeenCalledWith(
      "apply_payment_event",
      expect.objectContaining({ p_paid: true }),
    );
  });
});
