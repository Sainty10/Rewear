# Rewear on iPhone — Expo Go preview

This is a proper, isolated Expo/React Native project that opens the existing Rewear website in `react-native-webview`. It is **not Snack**, a native marketplace rewrite, an App Store release, or a way to enable missing website accounts/payments. The design, account screens, inventory and test checkout still come from the hosted Next.js site.

## Quick start on Windows PowerShell

Install **Node.js 24 LTS** from https://nodejs.org if it is not installed. Close and reopen PowerShell after installing it. Expo Go must already be installed on the iPhone. Xcode, Android Studio, Git, a paid EAS account and an Apple developer account are **not** needed for this SDK 54 Expo Go preview.

### Download the mobile branch without Git

Run this in PowerShell. It extracts into a fresh folder so it cannot overwrite your existing Rewear copy:

```powershell
$rewearZip = Join-Path $env:TEMP 'Rewear-Expo-Go.zip'
$rewearDestination = Join-Path $env:USERPROFILE ('Rewear-iPhone-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
Invoke-WebRequest -Uri 'https://github.com/Sainty10/Rewear/archive/refs/heads/codex/rewear-expo-go.zip' -OutFile $rewearZip
Expand-Archive -LiteralPath $rewearZip -DestinationPath $rewearDestination
$rewearRoot = Get-ChildItem -LiteralPath $rewearDestination -Directory | Select-Object -First 1
Set-Location (Join-Path $rewearRoot.FullName 'mobile')
node --version
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Installation failed; stop and read the npm error above.' }
npm.cmd run check:website
npx.cmd expo login
npm.cmd run start:tunnel
```

If GitHub asks you to sign in or PowerShell returns 404, download the ZIP using your signed-in browser from [this mobile branch](https://github.com/Sainty10/Rewear/tree/codex/rewear-expo-go) → **Code → Download ZIP**. Extract it, open its `mobile` folder, type `powershell` into File Explorer's address bar, then run the final five commands above, starting with `npm.cmd ci` (and its error check). Do not run them from `C:\Users\your-name` or from the website's root folder.

If you already use Git instead:

```powershell
git clone --branch codex/rewear-expo-go https://github.com/Sainty10/Rewear.git Rewear-iPhone
Set-Location .\Rewear-iPhone\mobile
npm.cmd ci
npx.cmd expo login
npm.cmd run start:tunnel
```

### Open on the iPhone

1. Sign into **Expo Go with the same Expo account** used by `npx.cmd expo login`. Enter credentials only in the local Expo login flow, never in chat or source files.
2. Leave PowerShell running. Once Expo prints a real `exp://...exp.direct` URL and QR code, scan it with the **iPhone Camera app** and choose **Open in Expo Go**. Alternatively, open your signed-in development server from Expo Go if it appears there.
3. Keep both phone and laptop online. The app loads the live website, not a local copy of the Next.js server. You do **not** need to run `npm run dev` for the website.
4. Stop with **Ctrl+C** when finished. Tunnel URLs expire and are not permanent app downloads.

If the tunnel times out, run `npm.cmd run start:lan`, connect the laptop and iPhone to the same private Wi-Fi network, and scan the **new LAN QR code**. Allow Node.js through Windows Firewall on that private network if Windows asks. Do not disable antivirus or the firewall globally. Public/guest Wi-Fi can isolate devices; use another network or a working tunnel.

`START-IPHONE.ps1` is an optional convenience launcher after extraction. The explicit `npm.cmd`/`npx.cmd` commands above avoid PowerShell's restrictions on npm's `.ps1` shims and do not change global execution policy.

## Expo Go version choice

The project deliberately uses **Expo SDK 54**, React Native **0.81.5**, React **19.1.0**, WebView **13.15.0**, and SDK-matched safe-area **5.6.x** dependencies. Expo's current platform-specific documentation says that the Apple App Store Expo Go build stops at SDK 54; SDK 55+ needs separately distributed Expo Go/TestFlight or a development build. Do not blindly upgrade this project to the latest SDK 58 just because npm marks it latest.

The current general creation guide also mentions an SDK 58 transition and SDK 57. For this particular **physical iPhone with App Store Expo Go** use case, we followed the more specific iOS compatibility note. If your Expo Go is a TestFlight/custom build, check its supported SDK before changing dependencies.

## Website configuration and verification

Default public origin: `https://rewear-wine-rho.vercel.app/`.

Override it only if the deployment moves:

```powershell
Copy-Item .env.example .env
notepad .env
```

Only `EXPO_PUBLIC_REWEAR_URL` belongs in that file. It must be an HTTPS **origin**, without `/rest/v1/`, a password, an auth code or API keys. Public Expo variables are embedded in the bundle. **Never put Supabase service keys, Stripe secrets, database passwords or Expo tokens here.** The mobile client does not call the database directly.

`npm.cmd run check:website` makes actual HTTPS requests to `/` and `/account`, checks the final origin and Rewear HTML, and exits unsuccessfully on HTTP/access/branding failures. It reports an unconfigured-account page without claiming accounts work.

**Cloud verification on 2026-10-20:** the workspace's egress proxy refused requests to the website with `CONNECT 403 Forbidden`. This is an environment access blocker, not an observed 403 from Vercel. Website availability, deployment protection and customer-account configuration could not be established here. Run the check from your laptop before relying on the URL. A Vercel login/protection page, missing deployment, or site error must be resolved in Vercel; the wrapper cannot fix it.

## What the wrapper handles

- Expo Router with one WebView screen and SDK-compatible native dependencies, installed in this directory's own lockfile.
- Safe areas on every edge, status-bar appearance and light/dark native chrome that follows the device.
- Loading, 30-second connection timeout, HTTP errors, crashed web process and explicit retry.
- Retry reconstructs a **page GET** rather than replaying an API POST or retaining an authentication callback. It does not queue or automatically retry purchases.
- Back, Home, Reload and Open in browser controls; Android hardware back and iOS back/forward gestures.
- Same-origin navigation, including login redirects, stays in the WebView. External HTTPS pages, Stripe Checkout/Connect, and `mailto:`/`tel:`/`sms:` links use the OS browser/handler. HTTPS child frames are permitted without opening a browser. Unsafe schemes, credentials in URLs, cleartext HTTP and file access are blocked.
- Persistent website cookie/local-storage support without extracting session tokens into React Native state. Safari and WKWebView do **not** share one browser session merely because `sharedCookiesEnabled` is set.
- Normal web photo inputs are preserved. The installed WebView supports native file selection; camera/library permission prompts are controlled by the **Expo Go host app** in Expo Go, not by this project's standalone Info.plist strings. Standalone-build permission descriptions are configured for a later build.

There is no custom JS message bridge, native Supabase client, native Stripe SDK, offline data cache or replay queue. The website's Stripe **test-mode restrictions are unchanged**. Browser/OS caching behavior is not a guarantee that no authenticated data is ever retained; sign out on shared devices.

## Login, email links and payment returns

Username/password login on the same origin can use the website's normal WebView cookies. It still requires the website's Supabase variables, schema, email configuration and allowed redirect URLs to be correct.

Email verification and password-reset links commonly open in Safari, which has a different cookie/PKCE context from the WebView. This preview does **not** implement native authenticated deep links or transfer session tokens between them. Verify email in the browser, then sign in inside the preview. For a password reset, use **Open in browser** and start/finish that reset in the same browser. If the site cannot complete that flow, fix its existing browser configuration first.

Stripe opens in the browser. Returning from Stripe does not mark an order paid in the app: the site's signed webhook remains authoritative. Return to Expo Go and navigate to your orders or explicitly reload the account page to inspect the result. Do not start another payment merely because a browser return did not change the WebView.

Actual login, photo selection/upload, email callbacks and Stripe returns need testing on the real iPhone with properly configured website services. None was claimed as passed in this environment.

## Developer checks

Run in `mobile/`:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo install --check
npx.cmd expo-doctor@latest
npm.cmd run export:ios
```

`expo export --platform ios` produces a real iOS JavaScript/Hermes bundle in ignored `dist-ios/`. It is not a signed `.ipa`, simulator build, App Store submission or device test.

For a network-restricted CI/cloud machine, `EXPO_OFFLINE=1` lets Expo use its installed SDK compatibility map for dependency selection and export. This does not skip npm's package-integrity/TLS checks. Do **not** use offline mode with a tunnel. Remote Doctor/schema/directory checks must be retried online; a locally passing export is not proof those network checks passed.

## Relationship to website and PR #1

- This branch is based on `main`; the website's package.json/lockfile, application logic, payment mode and production settings are unchanged.
- Root `tsconfig.json` excludes `mobile` so Next.js never type-checks the separate React Native dependency tree. Mobile has its own strict TypeScript configuration.
- Earlier PR #1 branch `codex/rewear-phone-app` has commit `9970f527629cf9321788b738bf12e716aed77e2a` with web installation, icons, a manifest, service worker and generic offline recovery. Its head and merge refs were inspected and its changes are not in `main`. They are preserved and **not merged/cherry-picked here**. The public GitHub PR page returned HTTP 200 and its embedded metadata confirmed `state: DRAFT`; API access was separately blocked.
- Root website checks still run from the repository root. This preview loads whichever version is actually deployed at its configured origin, regardless of which branch contains the native shell.

## Official references inspected

- https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/ — iPhone App Store SDK 54 restriction.
- https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/ — same-account requirement on physical iOS.
- https://docs.expo.dev/versions/v54.0.0/sdk/webview/ — WebView included in Expo Go.
- https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/
- https://docs.expo.dev/router/installation/ — native dependency/entry setup.
- https://docs.expo.dev/more/expo-cli/#tunneling
- https://github.com/react-native-webview/react-native-webview/blob/v13.15.0/docs/Reference.md

HTTP access to Expo docs was blocked in this workspace. The documentation was read from the official `expo/expo` Git repository instead: main commit `eb3b60fe64b29ac117949522b26dc66068ed08ce` for the current compatibility notices, and the official `sdk-54` branch for matching versioned module/router docs. This is why the version choice is documented explicitly rather than guessed from npm's latest tag.
