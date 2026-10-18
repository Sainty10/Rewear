# Put Rewear on the web

The chosen stack is Vercel for the website and Supabase for its accounts, PostgreSQL database and private photo storage. No app-store release is needed. This repository includes the Vercel configuration, but it has not been deployed by the coding environment: no hosting account or deployment credentials are connected.

## First: get a public website address

You can publish the public website before connecting accounts or payments. It will honestly show an empty marketplace and explain that accounts are opening soon.

1. Open https://vercel.com/new in your browser.
2. Choose **Continue with GitHub** and sign in as the account that can access **Sainty10/Rewear**.
3. If Vercel asks for repository access, grant access to **Rewear**. Import **Rewear**.
4. Leave **Framework Preset: Next.js** and **Root Directory: .** as detected. Do not select the `desktop` folder.
5. Use a plan permitted for your intended commercial use; review Vercel's current plan terms. Do not assume a personal free plan permits operating a commercial marketplace.
6. Click **Deploy**. When it finishes, open **Visit**. This is the real public website address you can bookmark and share.
7. In Vercel **Project → Settings → Environment Variables**, set `APP_URL` to that exact HTTPS address, without a trailing slash. Redeploy so authentication callbacks, sitemap and payment returns use the public address.

Account signup and checkout remain unavailable at this point. This publishes the website, not a validated trading service.

## Next: connect real accounts and listings

1. Create a Supabase project at https://supabase.com/dashboard. Choose a suitable UK/nearby region and keep its database password private.
2. In Supabase's **SQL Editor**, run these files in order, once each:
   - `supabase/migrations/20261018000000_initial.sql`
   - `supabase/migrations/20261018010000_bundle_details_and_recovery.sql`
   If the first migration was already applied, run only the second. Do not run the first migration again over an existing schema.
3. Copy the project URL and legacy anon JWT key from the project's API settings into Vercel environment variables named `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Add the legacy `service_role` API key as `SUPABASE_SERVICE_ROLE_KEY` in Vercel. It is secret: never paste it into chat, GitHub, a public variable, or a client-side file.
5. In Supabase Auth URL configuration, set **Site URL** to the website's exact HTTPS address and allow the `/auth/callback` redirect and `/auth/callback?next=/account/password` reset callback. Keep email confirmation enabled, set a strong password policy and configure SMTP before real user signup.
6. Enable authenticator-app MFA. Administrative access requires both a private database membership entry and a verified two-factor session, as described in README.md.
7. Redeploy in Vercel. Use separate real test accounts to verify signup, email verification, listing publication, owner-only editing, search, saved-search alerts and account isolation.

## Payments and launch gates

Start with Stripe Connect **test mode** only. Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel and set up the webhooks listed in README.md. Finish all connected checks in `docs/acceptance.md`. The code rejects live-mode keys and events. Removing that restriction is a separate change after the critical payment and marketplace-safety checks pass.

The initial checkout remains local pickup only. The shipping provider adapter is not a complete label-purchase flow. Shipping, staffed dispute support, prohibited-items enforcement, marketplace terms, privacy/retention procedures and chargeback operations remain public-trading launch gates. Do not take real payments until those are addressed and validated.

For a custom domain, buy a domain from your preferred registrar and add it under **Vercel → Project → Settings → Domains**. Follow Vercel's DNS instructions, then update `APP_URL`, Supabase allowed redirects and Stripe webhook URLs to the custom HTTPS domain and redeploy. A custom domain is optional for the initial website address.

## What happens after updates?

GitHub `main` is the source of truth. Once Vercel is connected, pushes to `main` normally trigger deployment. Your Windows folder does not update automatically: download a fresh ZIP if you also want the latest local copy. Online visitors use the hosted URL and do not need Node.js.
