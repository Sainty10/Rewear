import type { Metadata } from "next";
import Link from "next/link";
import AppearanceControl from "./components/appearance";
import { appearanceBootstrap } from "@/lib/appearance";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/800.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Rewear — A little outgrown. A lot to love.",
  description:
    "Buy and sell thoughtfully bundled pre-loved clothing for growing families.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="rewear-appearance-init"
          dangerouslySetInnerHTML={{ __html: appearanceBootstrap }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
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
            <AppearanceControl />
            <Link href="/account" aria-label="Your account">
              ♡ <span>My Rewear</span>
            </Link>
            <Link
              className="button small header-sell"
              href="/sell"
              aria-label="Sell a bundle"
            >
              <span aria-hidden="true">+</span>
              <span className="header-sell-text">Sell a bundle</span>
            </Link>
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <footer>
          <Link className="logo" href="/">
            rewear→
          </Link>
          <p>Good clothes deserve another chapter.</p>
          <div>Family first. Pre-loved always.</div>
          <div className="footer-links">
            <Link href="/how-it-works">How it works & fees</Link>
            <Link href="/safety">Buying, selling & safety</Link>
          </div>
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
