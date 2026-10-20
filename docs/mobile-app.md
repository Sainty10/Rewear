# Rewear phone app

This change adds an installable progressive web app to the existing Next.js marketplace. It preserves the existing account, inventory and Stripe test-mode boundaries. It does not create an Apple App Store or Google Play listing.

## Included

- Stable app identity, standalone launch, home-screen icons and shortcuts.
- Installation instructions at /install, with a browser installation button only when the browser supplies a real installation prompt.
- iPhone/iPad Safari and Android Chrome instructions.
- Safe-area spacing for phone notches and home indicators.
- An offline reconnect page. The service worker caches only this generic static page. Listings, account pages, messages, API responses and payments are never written to its cache. Mutations are not queued or replayed.
- Service-worker updates are fetched without reusing an HTTP-cached script. The worker registers in production only.

The existing Supabase setup and connected purchase/refund validation remain outstanding as described in README.md and docs/acceptance.md. Installation does not make the marketplace ready for real orders. Push notifications are not implemented.

## Validation

Run npm test, npm run build, npm run typecheck, then run the existing Playwright suite against the production server with REWEAR_E2E_PRODUCTION=1.

Verify /manifest.webmanifest; the 180, 192 and 512 pixel PNG endpoints; /install; /sw.js; and /offline.html.

On an actual iPhone, install from Safari and check the app icon, standalone launch, account login, photo upload and safe-area spacing. On Android, check Chrome installation and the same flows. Browser installation UI and operating-system behavior require real-device checks.

After visiting online and waiting for navigator.serviceWorker.ready, disconnect, reload a page, and confirm the reconnect page appears. Reconnect and use Try again. Confirm Cache Storage contains only /offline.html. Never run financial acceptance tests with live Stripe credentials.

## App-store release

For distribution through the Apple App Store and Google Play, build and test a native/hybrid mobile client against the existing backend. Include native photo selection, device navigation, authenticated deep links and an implemented notification service when in scope. Validate the complete marketplace flows, add the necessary account-deletion/reporting/blocking capabilities, prepare store privacy disclosures and assets, then sign and submit under the owner's developer accounts. Store acceptance is separate from a working web installation.

Official references:
- https://nextjs.org/docs/app/guides/progressive-web-apps
- https://developer.apple.com/app-store/review/guidelines/
