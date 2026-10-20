const OFFLINE_CACHE = "rewear-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(new URL(OFFLINE_URL, self.location.origin), { cache: "reload", credentials: "omit" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("rewear-offline-") && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/auth/callback"
  ) return;

  // Always fetch live pages. Never store listings, sessions, messages or payments.
  event.respondWith(
    fetch(request).catch(async () => {
      try {
        const cache = await caches.open(OFFLINE_CACHE);
        const fallback = await cache.match(OFFLINE_URL);
        if (fallback) return fallback;
      } catch {
        // A disabled Cache API must not prevent the reconnect message.
      }
      return new Response(
        "Rewear needs a connection. Please reconnect and try again.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }),
  );
});
