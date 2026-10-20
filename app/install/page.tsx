import type { Metadata } from "next";
import Link from "next/link";
import { InstallButton } from "../components/app-support";

export const metadata: Metadata = {
  title: "Get the Rewear app",
  description: "Add Rewear to your phone's home screen for a quicker way to buy and sell pre-loved clothing bundles.",
};

export default function InstallPage() {
  return (
    <main className="page narrow">
      <p className="eyebrow">A little closer. A lot to love.</p>
      <h1>Take Rewear with you.</h1>
      <p>Give Rewear a spot on your home screen. Open your bundles, offers and messages in a tap.</p>
      <section className="panel install-panel" aria-label="Install Rewear on your phone">
        <InstallButton showInstructions />
        <h2>iPhone or iPad</h2>
        <ol className="install-steps">
          <li>Open this Rewear page in Safari.</li>
          <li>Tap the Share button in the browser menu.</li>
          <li>Choose <strong>Add to Home Screen</strong>. Keep <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</li>
        </ol>
        <h2>Android</h2>
        <ol className="install-steps">
          <li>Open this Rewear page in Chrome.</li>
          <li>Tap <strong>Install Rewear</strong> above when available, or open Chrome's menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
          <li>Follow your phone's instructions to finish.</li>
        </ol>
        <p className="muted">Menu names vary by phone and browser. Buying, selling and messages need an internet connection.</p>
      </section>
      <Link className="button" href="/">Explore bundles →</Link>
    </main>
  );
}
