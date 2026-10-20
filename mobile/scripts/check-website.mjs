import { websiteOrigin } from "../src/lib/navigation.ts";
const origin = websiteOrigin(process.env.EXPO_PUBLIC_REWEAR_URL);
let failed = false;
for (const path of ["/", "/account"]) {
  try {
    const response = await fetch(new URL(path, origin), {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const final = new URL(response.url);
    const text = await response.text();
    if (
      !response.ok ||
      final.origin !== new URL(origin).origin ||
      !response.headers.get("content-type")?.includes("text/html") ||
      !text.toLowerCase().includes("rewear")
    )
      throw new Error(
        `HTTP ${response.status}: response is not a verified Rewear HTML page on the configured origin`,
      );
    console.log(`${path}: HTTP ${response.status}, Rewear HTML confirmed`);
    if (text.includes("Accounts are opening soon"))
      console.log(
        "Accounts are not configured on this deployment; the preview cannot enable them.",
      );
  } catch (error) {
    failed = true;
    console.error(
      `${path}: could not verify website (${error.cause?.code || error.message}). No website availability or account-readiness claim can be made.`,
    );
  }
}
process.exitCode = failed ? 1 : 0;
