import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "../app/manifest";
import { GET } from "../app/app-icons/[size]/route";

const workerSource = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
type WorkerEvent = {
  request?: { url: string; method: string; mode: string };
  respondWith?: (response: Promise<Response>) => void;
  waitUntil?: (work: Promise<unknown>) => void;
};

function worker() {
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const cache = {
    add: vi.fn(async (_request: Request) => {}),
    match: vi.fn(async (_url: string): Promise<Response | undefined> => new Response("Reconnect")),
  };
  const caches = {
    open: vi.fn(async (_name: string) => cache),
    keys: vi.fn(async () => ["rewear-offline-v0", "rewear-offline-v1", "another-app"]),
    delete: vi.fn(async (_name: string) => true),
  };
  const network = vi.fn(async (_request: unknown) => new Response("Live account"));
  const self = {
    location: { origin: "https://rewear.example" },
    addEventListener: (name: string, handler: (event: WorkerEvent) => void) => { handlers[name] = handler; },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  runInNewContext(workerSource, { self, caches, fetch: network, URL, Request, Response });
  return { handlers, cache, caches, network, self };
}

function navigate(h: ReturnType<typeof worker>, path: string, method = "GET", mode = "navigate") {
  let response: Promise<Response> | undefined;
  h.handlers.fetch({
    request: { url: new URL(path, "https://rewear.example").href, method, mode },
    respondWith: (value) => { response = value; },
  });
  return response;
}

describe("phone installation", () => {
  it("provides a stable standalone identity with installable PNG icons", () => {
    const app = manifest();
    expect(app.id).toBe("/");
    expect(app.scope).toBe("/");
    expect(app.display).toBe("standalone");
    expect(app.start_url).toBe("/");
    expect(app.icons?.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });
  for (const size of ["180", "192", "512"]) {
    it("serves a valid " + size + " pixel app icon", async () => {
      const response = await GET(new Request("https://rewear.example/app-icons/" + size), {
        params: Promise.resolve({ size }),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      const png = Buffer.from(await response.arrayBuffer());
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(png.readUInt32BE(16)).toBe(Number(size));
      expect(png.readUInt32BE(20)).toBe(Number(size));
    });
  }
  it("rejects arbitrary icon sizes", async () => {
    const response = await GET(new Request("https://rewear.example/app-icons/999999"), {
      params: Promise.resolve({ size: "999999" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("offline privacy and recovery", () => {
  it("precaches only the generic reconnect page without account cookies", async () => {
    const h = worker();
    let work: Promise<unknown> | undefined;
    h.handlers.install({ waitUntil: (value) => { work = value; } });
    await work;
    expect(h.cache.add).toHaveBeenCalledTimes(1);
    const request = h.cache.add.mock.calls[0][0];
    expect(new URL(request.url).pathname).toBe("/offline.html");
    expect(request.credentials).toBe("omit");
  });
  it("keeps authenticated navigation live without caching its response", async () => {
    const h = worker();
    const response = await navigate(h, "/account");
    expect(await response?.text()).toBe("Live account");
    expect(h.caches.open).not.toHaveBeenCalled();
  });
  it("shows the generic reconnect page after a network failure", async () => {
    const h = worker();
    h.network.mockRejectedValue(new Error("offline"));
    const response = await navigate(h, "/account");
    expect(await response?.text()).toBe("Reconnect");
    expect(h.cache.match).toHaveBeenCalledWith("/offline.html");
  });
  it("returns a reconnect response even if the fallback cache is unavailable", async () => {
    const h = worker();
    h.network.mockRejectedValue(new Error("offline"));
    h.caches.open.mockRejectedValue(new Error("cache unavailable"));
    const response = await navigate(h, "/");
    expect(response?.status).toBe(503);
  });
  it("does not intercept payments, authentication callbacks, writes or subresources", () => {
    const h = worker();
    expect(navigate(h, "/api/checkout")).toBeUndefined();
    expect(navigate(h, "/auth/callback?code=secret")).toBeUndefined();
    expect(navigate(h, "/account", "POST")).toBeUndefined();
    expect(navigate(h, "/account", "GET", "cors")).toBeUndefined();
    expect(navigate(h, "https://checkout.stripe.com/pay")).toBeUndefined();
    expect(h.network).not.toHaveBeenCalled();
  });
  it("removes only its own outdated cache versions", async () => {
    const h = worker();
    let work: Promise<unknown> | undefined;
    h.handlers.activate({ waitUntil: (value) => { work = value; } });
    await work;
    expect(h.caches.delete.mock.calls).toEqual([["rewear-offline-v0"]]);
    expect(h.self.clients.claim).toHaveBeenCalledOnce();
  });
});
