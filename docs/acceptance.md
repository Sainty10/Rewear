# Connected acceptance checks

Use a dedicated Supabase project and Stripe test mode. These are outstanding integration checks, not claims that the flows passed. Keep test data in an isolated environment, and remove it after tests; never publish fake inventory as real.

## Accounts and inventory

- Verify an actual email signup, rejected login before verification, login after verification, cookie refresh, signout, reset link expiry and password change with global session revocation.
- Confirm one account cannot modify another profile, view private photos, modify a bundle after reservation, forge photo ownership or grant itself administrator membership through any direct Supabase API.
- Upload a real photograph with EXIF location; download the stored object and confirm metadata removal. Reject invalid bytes, oversized files, oversized decoded images and unauthorized bucket uploads.
- Publish a verified multi-item bundle. Search every filter, save/favorite it using another account, and verify a matching saved-search alert appears only for that user. Verify mismatching alerts are absent.
- Request a real AI draft only with consent, check the output, and prove publication requires the seller's explicit verification.

## Payments

- Complete two distinct GB Connect Express test accounts, including pending/restricted capability states. A return URL alone must not enable selling.
- Start two concurrent buyers against one bundle. Only one live order may exist; the winning price and commission must come from the database.
- Pay using Stripe test payment methods. Assert amount, destination account, fee, order status and transaction history. A forged success URL, bad signature, altered amount or live-mode event must not mark an order paid.
- Replay and reorder valid payment/expiry/refund events. Assert exactly-once durable state, no double transfer/refund, no release of paid inventory and retryable failure before any refund whose payment has not been recorded.
- Cancel and resume Checkout; expire a session and verify release. Inject API and database failures around session creation. Validate the pending-order “Check payment status” recovery against real Stripe API failures, pagination and delayed events before launch. Add scheduled reconciliation and operator alerts.
- Issue a full refund. Verify refund status, transfer reversal, application-fee refund, seller balance, transaction history and contribution margin inputs against Stripe.
- Verify payout eligibility, pending/available balance and test payout history through Stripe Express. Never equate an order's seller proceeds with a completed bank payout.
- Implement chargebacks, partial refunds, payment-event recovery and operational alerts before enabling live mode. Live mode is intentionally rejected by this implementation.

## Safety and operations

- Prove an authenticated nonadministrator and an administrator at AAL1 cannot view dashboard data or perform moderation. Require an AAL2 session for the administrator.
- Report and withdraw a listing. Confirm public disappearance. Review/resolution and order-status changes must leave an audit record.
- Define how to hide harmful sold/reserved listings without losing fulfillment evidence; active-only removal is insufficient for launch.
- Open, investigate and resolve a real test dispute. Verify both parties can message only within their own order; escape all displayed content and keep home addresses private.
- Exercise pickup guidance and ensure no address is revealed automatically. Establish a staffed escalation/contact route before inviting sellers.
- Validate cost entries and metric totals against SQL/Stripe. Add SQL aggregation and pagination before datasets exceed API row limits.
- Complete shipping rate selection, label purchasing, tracking callbacks, refund/cancellation semantics and provider sandbox tests before enabling shipping checkout.
- Set retention/deletion, prohibited-items, returns/refund and marketplace terms; test operator incident recovery and backups.
