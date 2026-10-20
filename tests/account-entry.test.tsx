import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({
  configured: true,
  getUser: vi.fn(),
  db: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  configured: () => state.configured,
  db: state.db,
}));

import Account from "../app/account/page";

beforeEach(() => {
  vi.clearAllMocks();
  state.configured = true;
  state.getUser.mockResolvedValue({ data: { user: null }, error: null });
  state.db.mockResolvedValue({ auth: { getUser: state.getUser } });
});

describe("Account entry when signed out", () => {
  it("offers the actual authentication route when accounts are configured", async () => {
    const page = await Account({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(page);
    expect(html).toMatch(/href="\/auth"[^>]*>Sign in/);
    expect(html).not.toContain('href="/how-it-works"');
    expect(state.getUser).toHaveBeenCalledOnce();
  });

  it("keeps unconfigured accounts closed without attempting authentication", async () => {
    state.configured = false;
    const page = await Account({ searchParams: Promise.resolve({}) });
    expect(renderToStaticMarkup(page)).toContain("Accounts are opening soon.");
    expect(state.db).not.toHaveBeenCalled();
  });
});
