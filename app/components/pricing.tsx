"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { bundlePrice, poundsToPence, gbp } from "@/lib/pricing";
export function PriceBreakdown({
  price,
  quantity,
}: {
  price: string;
  quantity: number;
}) {
  const pence = poundsToPence(price);
  const result = pence === null ? null : bundlePrice(pence, quantity);
  return (
    <div className="pricing-summary" aria-live="polite" aria-atomic="true">
      {result ? (
        <>
          <div className="row">
            <span>Buyer pays for the bundle</span>
            <strong>{gbp(result.total)}</strong>
          </div>
          <div className="row">
            <span>Average price per piece</span>
            <strong>{gbp(result.perPiece)}</strong>
          </div>
          <div className="row">
            <span>Rewear fee (10%)</span>
            <strong>{gbp(result.fee)}</strong>
          </div>
          <div className="row">
            <span>Seller receives</span>
            <strong>{gbp(result.seller)}</strong>
          </div>
          <small>
            GBP estimate for local pickup, before refunds or other adjustments.
            Stripe processing is paid by Rewear. No shipping fee is included.
          </small>
        </>
      ) : (
        <p className="muted">
          Enter a bundle price (£1–£1,000) and 1–100 pieces to see the
          breakdown.
        </p>
      )}
    </div>
  );
}
export default function BundleCalculator() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  return (
    <section className="section" id="fees">
      <div className="fee-calculator">
        <div>
          <div className="eyebrow">LESS GUESSWORK. MORE GOOD FINDS.</div>
          <h2>
            One bundle.
            <br />
            Every penny explained.
          </h2>
          <p>
            Free to join. Free to list. Rewear takes 10% when your bundle sells.
            See what your buyer pays and exactly what you keep.
          </p>
          <Link className="text-link" href="/how-it-works">
            How buying & selling works →
          </Link>
        </div>
        <div className="calculator-form stack" aria-busy={!ready}>
          <div className="form-grid">
            <label>
              Number of pieces
              <input
                disabled={!ready}
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 8"
              />
            </label>
            <label>
              Bundle price (£)
              <input
                disabled={!ready}
                type="number"
                min={1}
                max={1000}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 20.00"
              />
            </label>
          </div>
          <PriceBreakdown price={price} quantity={Number(quantity)} />
        </div>
      </div>
    </section>
  );
}
