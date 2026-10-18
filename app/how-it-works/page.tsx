import Link from "next/link";
import BundleCalculator from "@/app/components/pricing";
export const metadata = { title: "How Rewear works & fees | Rewear" };
export default function How() {
  return (
    <main className="page">
      <div className="eyebrow">ONE BUNDLE. ONE GOOD NEXT CHAPTER.</div>
      <h1>
        Less listing.
        <br />
        More living.
      </h1>
      <p>
        Rewear starts with a simple idea: buying a useful bundle should be
        easier than chasing lots of individual pieces.
      </p>
      <div className="info-grid">
        <article>
          <h2>1. Tell the whole story</h2>
          <p>
            Sellers upload real photos and group their clothes by item, size and
            condition. Optional AI assistance drafts words; sellers check every
            detail.
          </p>
          <Link className="text-link" href="/sell">
            Make a bundle →
          </Link>
        </article>
        <article>
          <h2>2. Find the right fit</h2>
          <p>
            Search the size you need, compare the price per piece and check the
            full contents. Save your search for in-app alerts when matching
            clothes arrive.
          </p>
          <Link className="text-link" href="/#discover">
            Find a bundle →
          </Link>
        </article>
        <article>
          <h2>3. Keep things clear</h2>
          <p>
            The seller’s 10% fee is shown before listing. Pay through checkout,
            keep order messages here and confirm receipt after checking the
            clothes.
          </p>
          <Link className="text-link" href="/safety">
            Read the safety guide →
          </Link>
        </article>
      </div>
      <div className="notice">
        Rewear is currently a development marketplace. Payments use Stripe test
        mode. Shipping checkout is not enabled. A seller needs Stripe onboarding
        and local pickup enabled before test checkout is available.
      </div>
      <BundleCalculator />
      <section className="panel">
        <h2>What does it cost?</h2>
        <p>
          Accounts and listings are free. When a bundle sells, Rewear’s
          commission is 10% of the agreed bundle price, rounded to the nearest
          penny. The buyer’s local-pickup checkout total is the agreed bundle
          price. The platform pays Stripe processing fees; shipping is not
          included.
        </p>
        <p>
          Full refunds are supported in the test workflow. Sellers or an
          administrator request the refund, and the status changes after Stripe
          confirms it. Seller payout timing depends on Stripe; Rewear does not
          promise immediate payout.
        </p>
      </section>
    </main>
  );
}
