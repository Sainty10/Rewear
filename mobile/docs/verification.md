# Verification record — 2026-10-20

## Scope and source inspection

- Started from clean `main` at `05dcbbb55437c3b4df5e52ed16494af1bc75367b` and created `codex/rewear-expo-go`.
- Inspected repository AGENTS instructions and official Expo SDK 54 documentation.
- Inspected PR #1 head `9970f527629cf9321788b738bf12e716aed77e2a`, its diff and merge ref. The public GitHub PR page returned HTTP 200 and embedded `state: DRAFT`. It is separate PWA installation/offline work and is not merged into this branch.
- No website application/payment code, website dependencies/lockfile, production environment variables or production settings changed. Root tsconfig excludes mobile and root README links to the separate project.

## Passed in the cloud workspace

- Mobile `npm ci` from its own lockfile, with normal npm integrity/TLS verification.
- Mobile `npm run typecheck`.
- Mobile `EXPO_OFFLINE=1 npm run lint`.
- Mobile `npm test`: **12 passed**, covering URL boundaries, login/callback navigation classification, external checkout/contact links, unsafe schemes, safe GET-only retry and error/load ordering.
- Mobile `EXPO_OFFLINE=1 npx expo install --check`: installed dependencies match the SDK's local compatibility map. React and React DOM are both 19.1.0, React Native 0.81.5, WebView 13.15.0, safe-area context 5.6.2, Expo 54.0.37.
- Mobile `EXPO_OFFLINE=1 npm run export:ios`: real iOS Hermes bundle, **982 modules**, about **2.56 MB**, plus assets and metadata. Generated output is ignored, not committed.
- Exported-bundle marker check found no `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `sk_live_` or `sk_test_` strings. This is a limited accidental-inclusion check, not a comprehensive secret/security audit.
- Local Metro: iOS manifest **HTTP 200**, runtime `exposdk:54.0.0`; iOS development bundle **HTTP 200**, **6,176,092 bytes**, containing WebView code. The localhost-only server is left running for internal diagnosis; it is not a remotely accessible preview.
- Website `npm test`: **102 passed**.
- Website `npm run build`: passed, including Next.js compilation/type checks and route generation with the mobile directory excluded.

## Blocked / not established

- Website `/` and `/account`: workspace egress proxy rejects HTTPS CONNECT with **403 Forbidden**. This does not establish the Vercel deployment's response status. `npm run check:website` correctly exits unsuccessfully rather than calling the site verified.
- `expo-doctor`: **16/18 checks passed**, with two remote checks failing because Expo config-schema and React Native Directory endpoints could not be reached (`fetch failed` / `EAI_AGAIN exp.host`). Those checks are not counted as passed. Rerun online on the laptop.
- Expo CLI `whoami`: **Not logged in**. No user password/token was requested in chat or embedded in source. Physical iOS requires the user's CLI and Expo Go account to match per current official docs.
- `npm run start:tunnel`: actual attempt failed with **ngrok tunnel took too long to connect**. No working public preview URL or QR code was produced; no localhost QR is presented as an iPhone preview.
- A localhost-only, offline Metro server can serve the project for internal diagnosis, but it is not reachable by the user's iPhone from this cloud workspace.
- Actual iPhone rendering, safe-area geometry, photo picker/camera permissions, upload, verified-email login, password reset and Stripe browser return: **not device-tested**. No signed native build, TestFlight or App Store release was performed.

## Required device acceptance

Use the Windows commands in the mobile README to start a real authenticated tunnel (or LAN server) on the user's laptop, scan its actual QR code and check:

1. Website opens and its existing appearance controls, discovery and seller screens remain usable above the home indicator.
2. Back/forward, Home, Reload, connection loss/retry, external links and browser return behave correctly.
3. A real test account can sign in, retain its session through navigation/reload, sign out, and open its own account only. Handle email verification/reset in the same browser/PKCE context as documented.
4. Photo library selection and upload work against the configured website. Test denial/regrant of Expo Go photo/camera permissions.
5. Test-mode Stripe Checkout/Connect opens in the browser. Verify signed webhook outcomes in orders after returning; do not create duplicate payments to compensate for a stale page.
6. Website service readiness and all production marketplace acceptance gates remain independent of this wrapper.
