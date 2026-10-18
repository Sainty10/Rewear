import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "Rewear — A little outgrown. A lot to love.",
  description:
    "Buy and sell thoughtfully bundled pre-loved clothing for growing families.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <Link className="logo" href="/">
            rewear<span>→</span>
          </Link>
          <nav>
            <Link href="/?category=Baby">Baby</Link>
            <Link href="/?category=Kids">Kids</Link>
            <Link href="/?category=Women">Women</Link>
            <Link href="/?category=Men">Men</Link>
          </nav>
          <div className="header-actions">
            <Link href="/account" aria-label="Your account">
              ♡ <span>My Rewear</span>
            </Link>
            <Link className="button small" href="/sell">
              + Sell a bundle
            </Link>
          </div>
        </header>
        {children}
        <footer>
          <Link className="logo" href="/">
            rewear→
          </Link>
          <p>Good clothes deserve another chapter.</p>
          <div>Family first. Pre-loved always.</div>
          <p className="muted">
            An early marketplace · Payments use Stripe test mode
          </p>
        </footer>
        <div className="mobile-nav">
          <Link href="/">Discover</Link>
          <Link href="/sell">＋ Sell</Link>
          <Link href="/account">My Rewear</Link>
        </div>
      </body>
    </html>
  );
}
