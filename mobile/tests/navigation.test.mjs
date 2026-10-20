import { test } from "node:test";
import assert from "node:assert/strict";
import {
  websiteOrigin,
  destination,
  retryPage,
  DEFAULT_WEBSITE,
} from "../src/lib/navigation.ts";
test("the default is the public website, not a backend endpoint or secret", () =>
  assert.equal(websiteOrigin(undefined), DEFAULT_WEBSITE));
test("a configured website must be an HTTPS origin", () => {
  assert.equal(websiteOrigin("https://example.com"), "https://example.com/");
  for (const url of [
    "http://example.com",
    "https://example.com/rest/v1/",
    "https://user:password@example.com",
    "https://example.com/?token=x",
    "javascript:alert(1)",
  ])
    assert.throws(() => websiteOrigin(url));
});
test("same-origin login and account redirects stay inside the WebView", () => {
  for (const path of [
    "/account",
    "/auth",
    "/auth/callback?code=one-time",
    "/sell",
    "/api/actions",
  ])
    assert.equal(
      destination(new URL(path, DEFAULT_WEBSITE).href, DEFAULT_WEBSITE),
      "internal",
    );
});
test("checkout, Connect, third-party sites and contact links go to the OS browser/handler", () => {
  for (const url of [
    "https://checkout.stripe.com/c/pay/test",
    "https://connect.stripe.com/setup",
    "https://example.com",
    "mailto:support@example.com",
    "tel:+441234567890",
    "sms:+441234567890",
  ])
    assert.equal(destination(url, DEFAULT_WEBSITE), "external");
});
test("a lookalike host is never trusted as the website", () =>
  assert.equal(
    destination(
      "https://rewear-wine-rho.vercel.app.evil.example/account",
      DEFAULT_WEBSITE,
    ),
    "external",
  ));
test("unsafe or malformed URL schemes are blocked", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///etc/passwd",
    "intent://test",
    "http://example.com",
    "https://user:secret@example.com",
    "not a URL",
  ])
    assert.equal(destination(url, DEFAULT_WEBSITE), "blocked");
});
test("renderer about:blank is the only permitted blank URL", () => {
  assert.equal(destination("about:blank", DEFAULT_WEBSITE), "blank");
  assert.equal(destination("about:config", DEFAULT_WEBSITE), "blocked");
});
test("retry can reload a normal account page with non-sensitive filters", () =>
  assert.equal(
    retryPage(DEFAULT_WEBSITE + "account?tab=orders", DEFAULT_WEBSITE),
    DEFAULT_WEBSITE + "account?tab=orders",
  ));
test("retry never replays API endpoints or stores one-time authentication links", () => {
  for (const path of [
    "api",
    "api/checkout",
    "auth/callback?code=secret",
    "account?access_token=secret",
    "account#refresh_token=secret",
    "account?token_hash=secret",
  ])
    assert.equal(retryPage(DEFAULT_WEBSITE + path, DEFAULT_WEBSITE), null);
  assert.equal(
    retryPage("https://checkout.stripe.com/c/pay", DEFAULT_WEBSITE),
    null,
  );
});
