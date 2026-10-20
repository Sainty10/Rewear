export const DEFAULT_WEBSITE = "https://rewear-wine-rho.vercel.app/";
export type Destination = "internal" | "external" | "blank" | "blocked";
export function websiteOrigin(value: string | undefined): string {
  const url = new URL(value?.trim() || DEFAULT_WEBSITE);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use the public HTTPS website origin, without a path, query, password or API key.",
    );
  return url.origin + "/";
}
export function destination(raw: string, website: string): Destination {
  if (raw === "about:blank") return "blank";
  try {
    const url = new URL(raw);
    if (url.username || url.password) return "blocked";
    if (url.protocol === "https:")
      return url.origin === new URL(website).origin ? "internal" : "external";
    if (["mailto:", "tel:", "sms:"].includes(url.protocol)) return "external";
  } catch {
    /* Malformed links never reach an operating-system URL handler. */
  }
  return "blocked";
}
/** Retry only a page GET, never an API mutation or one-time auth callback. */
export function retryPage(raw: string, website: string): string | null {
  if (destination(raw, website) !== "internal") return null;
  const url = new URL(raw);
  if (
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/auth/callback"
  )
    return null;
  // Tokens/codes must not be retained in native retry state or browser links.
  if (
    ["code", "token", "access_token", "refresh_token", "token_hash"].some(
      (key) => url.searchParams.has(key),
    ) ||
    /(?:access_token|refresh_token)=/.test(url.hash)
  )
    return null;
  return url.href;
}
