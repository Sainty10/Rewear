"use client";
import { useEffect, useState } from "react";
import {
  APPEARANCE_KEY,
  appearance,
  resolvedAppearance,
  type Appearance,
} from "@/lib/appearance";
function apply(preference: Appearance) {
  const root = document.documentElement;
  root.dataset.appearance = preference;
  root.dataset.theme = resolvedAppearance(
    preference,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}
export default function AppearanceControl() {
  const [preference, setPreference] = useState<Appearance>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    function sync() {
      let value: unknown;
      try {
        value = localStorage.getItem(APPEARANCE_KEY);
      } catch {
        value = document.documentElement.dataset.appearance;
      }
      const next = appearance(value);
      setPreference(next);
      apply(next);
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChanged = () => {
      if (document.documentElement.dataset.appearance === "system")
        apply("system");
    };
    const stored = (event: StorageEvent) => {
      if (event.key === APPEARANCE_KEY || event.key === null) sync();
    };
    sync();
    setReady(true);
    media.addEventListener("change", systemChanged);
    window.addEventListener("storage", stored);
    return () => {
      media.removeEventListener("change", systemChanged);
      window.removeEventListener("storage", stored);
    };
  }, []);
  return (
    <label className="appearance-control">
      <span>Appearance</span>
      <select
        aria-label="Appearance"
        disabled={!ready}
        value={preference}
        onChange={(event) => {
          const next = appearance(event.target.value);
          setPreference(next);
          apply(next);
          try {
            localStorage.setItem(APPEARANCE_KEY, next);
          } catch {
            /* The selection still works for this visit when storage is blocked. */
          }
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
