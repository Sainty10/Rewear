# Website launch record — 2026-10-20

The current task targets the website. Expo is a separate branch and is not required for visitors to use Rewear in Safari, Chrome or another browser.

## Prepared changes

- Branch: `codex/rewear-web-launch`, based on website main commit `05dcbbb55437c3b4df5e52ed16494af1bc75367b`.
- Fixed the signed-out account page's sign-in link to open `/auth`.
- Added `20261020000000_pickup_reservation_guards.sql`. Direct reservation RPC calls now require a confirmed email, explicit local pickup and the existing action quota. Earlier SQL migrations were not edited; this file has not been applied to a hosted database.
- Added two account-entry regression checks and seven database regression cases. Test fixtures exist only inside automated tests and are never public inventory.
- Stripe keys/events remain restricted to test mode. No production settings, real orders or payment credentials were changed.

## Verification in this workspace

- `npm test`: **111 passed**, including **43 embedded PostgreSQL checks**. This is not connected Supabase acceptance.
- `npm run build`: passed, including TypeScript and production route generation.
- `REWEAR_E2E_PRODUCTION=1 npm run test:e2e`: **48 passed** in desktop and mobile-sized Chromium against the local production server, including search, account gating, administrator rejection, pricing, light/dark/system appearance and automated public-page accessibility checks. This suite uses the honest unconfigured state; it does not prove connected accounts or transactions.
- Public website `/` and `/account` at https://rewear-wine-rho.vercel.app: requests were rejected by the workspace egress proxy's HTTPS CONNECT **403 Forbidden**. This is not an observed HTTP response from Vercel and does not prove the site is down or up.
- The supplied Supabase project's Auth endpoint and Vercel/Supabase management endpoints are blocked by the same proxy.
- Vercel CLI 64.7.0 installed in an external npm cache, with its help command verified. An actual browser-login initiation failed with `fetch failed`; no valid device-login link was generated and no account login completed.
- There are no usable Vercel or Supabase service credentials configured in this running environment. The public Supabase origin alone cannot enable accounts.

## Access needed to continue deployment

Cloud environment draft updates were saved for review; they do not grant access to the current runtime automatically and are not website deployments:

1. Preserved existing allowed domains and added `vercel.com`, `api.vercel.com`, `supabase.com`, `api.supabase.com` and `riyvgayywghjkpvrbmpz.supabase.co`. The existing website domain remains listed.
2. Added secret requirements `VERCEL_TOKEN` (restricted to `api.vercel.com`) and `SUPABASE_ACCESS_TOKEN` (restricted to `api.supabase.com`). Enter values only in this task's secure environment settings. Never put them in chat, repository files, frontend environment variables or logs. Create them through https://vercel.com/account/settings/tokens and https://supabase.com/dashboard/account/tokens for the accounts/team owning Rewear.

After those settings become available, retry actual read-only service requests. Inspect the existing Vercel project and Supabase migration/schema/Auth state before modifying anything. Preserve existing environment variables, custom domains, inventory and accounts. Apply only pending migrations; do not rerun the initial schema. Configure the required server/public bindings and exact callback origins, then deploy the reviewed website changes. Do not change Stripe to live mode.

## Remaining launch gates

A shareable page is separate from a ready trading marketplace. Hosted signup, email delivery and verification, login/session recovery, photo upload, ownership isolation and real test-mode Stripe purchase/refund/payout are not yet validated. SMTP and service configuration status are unknown. The connected checks and operational limitations in [acceptance.md](acceptance.md) still apply. No claim of production readiness or device testing is made.
