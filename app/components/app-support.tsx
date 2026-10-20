"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};
type AppState = {
  installed: boolean;
  available: boolean;
  busy: boolean;
  message: string;
  install(): Promise<void>;
};
const AppContext = createContext<AppState | null>(null);

export default function AppSupport({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const syncDisplay = () => {
      const ios = navigator as Navigator & { standalone?: boolean };
      setInstalled(display.matches || ios.standalone === true);
    };
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setMessage("");
    };
    syncDisplay();
    display.addEventListener("change", syncDisplay);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Installation and online browsing still work without offline support.
          console.warn("Rewear offline support is unavailable in this browser.");
        });
    }
    return () => {
      display.removeEventListener("change", syncDisplay);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Complete installation in your browser."
          : "You can install Rewear later from your browser menu.",
      );
    } catch {
      setMessage("Use your browser menu to add Rewear to your home screen.");
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  return (
    <AppContext.Provider value={{ installed, available: !!prompt, busy, message, install }}>
      {children}
    </AppContext.Provider>
  );
}

export function InstallButton({ showInstructions = false }: { showInstructions?: boolean }) {
  const app = useContext(AppContext);
  if (!app) return null;
  if (app.installed) {
    return showInstructions ? <p className="notice" role="status">You're using the Rewear app.</p> : null;
  }
  return (
    <div className="app-install-control">
      {app.available ? (
        <button className="button small" type="button" disabled={app.busy} onClick={() => void app.install()}>
          {app.busy ? "Opening installation…" : "Install Rewear"}
        </button>
      ) : showInstructions ? (
        <p className="muted">Follow the steps for your phone below.</p>
      ) : (
        <Link href="/install">Get Rewear on your phone</Link>
      )}
      {app.message && <p role="status">{app.message}</p>}
    </div>
  );
}
