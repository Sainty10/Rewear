"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { conditions, type BundleItem } from "@/lib/domain";
import type { EditableBundle } from "@/lib/listing-types";
import { PriceBreakdown } from "@/app/components/pricing";
const emptyItem = (): BundleItem => ({
  name: "",
  size: "",
  brand: "",
  condition: "Good",
  quantity: 1,
  notes: "",
});
export default function SellForm({ initial }: { initial?: EditableBundle }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>(
    initial?.photos ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
  });
  const [items, setItems] = useState<BundleItem[]>(
    initial?.items?.length ? initial.items : [emptyItem()],
  );
  const [price, setPrice] = useState(
    initial ? String(initial.price_pence / 100) : "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const total = items.reduce((n, i) => n + i.quantity, 0);
  function updateItem(index: number, patch: Partial<BundleItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  function validateSection(index: number) {
    const section = formRef.current?.querySelector(`[data-step="${index}"]`);
    const controls = section?.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input,select,textarea");
    for (const control of controls ?? []) {
      if (!control.checkValidity()) {
        setStep(index);
        requestAnimationFrame(() => control.reportValidity());
        return false;
      }
    }
    return true;
  }
  function next() {
    setError("");
    if (step === 0 && !photos.length) {
      setError("Add at least one photo of the actual clothes.");
      return;
    }
    if (validateSection(step)) setStep((s) => Math.min(2, s + 1));
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        const f = new FormData();
        f.set("photo", file);
        const r = await fetch("/api/upload", { method: "POST", body: f });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setPhotos((p) => [...p, d]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photos.map((p) => p.id) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setDraft({ title: d.title, description: d.description });
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 2) {
      next();
      return;
    }
    if (!photos.length) {
      setStep(0);
      setError("Add at least one real photo.");
      return;
    }
    for (let i = 0; i < 3; i++) if (!validateSection(i)) return;
    if (total < 1 || total > 100) {
      setStep(1);
      setError("A bundle must contain 1–100 pieces.");
      return;
    }
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(f),
      items,
      quantity: total,
      price_pence: Math.round(Number(price) * 100),
      pickup: f.get("pickup") === "on",
      verified: f.get("verified") === "on",
      photos: photos.map((p) => p.id),
    };
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: initial ? "update_listing" : "publish",
          listing_id: initial?.id,
          ...body,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`/listing/${d.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack panel" onSubmit={submit} noValidate ref={formRef}>
      <nav className="seller-steps" aria-label="Listing progress">
        {["1. Photos", "2. Bundle contents", "3. Price & review"].map(
          (label, i) => (
            <button
              key={label}
              type="button"
              disabled={!ready || busy || i > step}
              aria-current={i === step ? "step" : undefined}
              onClick={() => setStep(i)}
            >
              {label}
            </button>
          ),
        )}
      </nav>
      <fieldset
        className="form-step"
        disabled={!ready}
        data-step="0"
        hidden={step !== 0}
      >
        <legend>First, a few good photos.</legend>
        <label>
          Add clear photos (up to 8)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy || photos.length >= 8}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
        <small className="muted">
          Lay the clothes out together and photograph any marks. Avoid faces,
          names, school badges and addresses. JPEG, PNG or WebP, up to 8 MB
          each. Location metadata is removed.
        </small>
        <div className="photos">
          {photos.map((p, i) => (
            <div key={p.id}>
              <img src={p.url} alt={`Bundle photo ${i + 1}`} />
              <button
                type="button"
                disabled={!ready || busy}
                onClick={() =>
                  setPhotos((ps) => ps.filter((x) => x.id !== p.id))
                }
              >
                Remove photo {i + 1}
              </button>
            </div>
          ))}
        </div>
        <button
          disabled={busy || !photos.length}
          type="button"
          className="button light"
          onClick={generate}
        >
          ✦ Help me write a draft
        </button>
        <small className="muted">
          Optional: sends these photos to OpenAI to suggest a title and
          description. You will check all suggestions before publishing. You can
          also write everything yourself.
        </small>
      </fieldset>
      <fieldset
        className="form-step"
        disabled={!ready}
        data-step="1"
        hidden={step !== 1}
      >
        <legend>Exactly what’s in the bundle?</legend>
        <label>
          Bundle title
          <input
            name="title"
            required
            minLength={8}
            maxLength={120}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. Everyday layers, 2–3 years"
          />
        </label>
        <label>
          Description & overall wear
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={4000}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            placeholder="Describe the clothes, how they fit and any marks or repairs."
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select name="category" defaultValue={initial?.category ?? "Baby"}>
              {["Baby", "Kids", "Women", "Men", "Other"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Main size / range
            <input
              name="size"
              defaultValue={initial?.size}
              placeholder="e.g. 2–3 years"
              required
              maxLength={40}
            />
          </label>
          <label>
            Brand(s)
            <input
              name="brand"
              defaultValue={initial?.brand}
              required
              maxLength={80}
              placeholder="e.g. Mixed brands"
            />
          </label>
          <label>
            Overall condition
            <select
              name="condition"
              defaultValue={initial?.condition ?? "Good"}
            >
              {conditions.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted">
          Group similar items together: “3 T-shirts” can be one row. Include the
          size and wear for each group so buyers know what they’re getting.
        </p>
        {items.map((item, i) => (
          <fieldset className="bundle-group stack" key={i}>
            <legend>Clothing group {i + 1}</legend>
            <div className="form-grid">
              <label>
                Item or garment type
                <input
                  aria-label={`Group ${i + 1} garment type`}
                  value={item.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="e.g. T-shirts"
                />
              </label>
              <label>
                Pieces
                <input
                  aria-label={`Group ${i + 1} pieces`}
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateItem(i, { quantity: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Size
                <input
                  aria-label={`Group ${i + 1} size`}
                  required
                  maxLength={40}
                  value={item.size}
                  onChange={(e) => updateItem(i, { size: e.target.value })}
                />
              </label>
              <label>
                Brand
                <input
                  aria-label={`Group ${i + 1} brand`}
                  required
                  maxLength={80}
                  value={item.brand}
                  onChange={(e) => updateItem(i, { brand: e.target.value })}
                  placeholder="Mixed / unbranded if needed"
                />
              </label>
              <label>
                Condition
                <select
                  aria-label={`Group ${i + 1} condition`}
                  value={item.condition}
                  onChange={(e) =>
                    updateItem(i, {
                      condition: e.target.value as BundleItem["condition"],
                    })
                  }
                >
                  {conditions.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Marks, repairs or fit notes
                <input
                  aria-label={`Group ${i + 1} notes`}
                  maxLength={500}
                  value={item.notes}
                  onChange={(e) => updateItem(i, { notes: e.target.value })}
                  placeholder="Disclose any defects"
                />
              </label>
            </div>
            {items.length > 1 && (
              <button
                type="button"
                className="remove-group"
                onClick={() =>
                  setItems((p) => p.filter((_, index) => index !== i))
                }
              >
                Remove group {i + 1}
              </button>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          className="button light"
          disabled={items.length >= 30 || busy}
          onClick={() => setItems((p) => [...p, emptyItem()])}
        >
          + Add another clothing group
        </button>
        <div className="contents-total" role="status">
          <strong>{total} pieces</strong> across {items.length} clothing{" "}
          {items.length === 1 ? "group" : "groups"}
          {total > 100 ? " — reduce to 100 pieces or fewer." : ""}
        </div>
      </fieldset>
      <fieldset
        className="form-step"
        disabled={!ready}
        data-step="2"
        hidden={step !== 2}
      >
        <legend>A fair price. A clear next step.</legend>
        <label>
          Price for all {total} pieces (£)
          <input
            name="price"
            type="number"
            min={1}
            max={1000}
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <PriceBreakdown price={price} quantity={total} />
        <label>
          Town (never your full address)
          <input
            name="location"
            defaultValue={initial?.location}
            required
            minLength={2}
            maxLength={80}
          />
        </label>
        <label className="check">
          <input
            name="pickup"
            defaultChecked={initial?.pickup}
            type="checkbox"
          />
          Offer local pickup. Agree a busy public meeting place in order
          messaging.
        </label>
        <div className="notice">
          Shipping checkout is not available yet. Buyers can currently pay for
          bundles offering local pickup, after you complete Stripe seller
          onboarding.
        </div>
        <div className="photos">
          {photos.map((p, i) => (
            <img key={p.id} src={p.url} alt={`Review bundle photo ${i + 1}`} />
          ))}
        </div>
        <strong>{draft.title || "Your bundle title"}</strong>
        <p className="muted">
          {total} pieces ·{" "}
          {items.map((i) => `${i.quantity} ${i.name}`).join(", ")}
        </p>
        <label className="check">
          <input name="verified" type="checkbox" required />I have checked every
          photo and detail, including AI suggestions, sizes, brands, number of
          pieces and defects. I own these clothes. This listing contains no
          personal information.
        </label>
      </fieldset>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <div className="step-actions">
        {step > 0 && (
          <button
            className="button light"
            disabled={!ready || busy}
            type="button"
            onClick={() => setStep((s) => s - 1)}
          >
            ← Back
          </button>
        )}
        {step < 2 ? (
          <button
            className="button"
            disabled={!ready || busy}
            type="button"
            onClick={next}
          >
            Continue →
          </button>
        ) : (
          <button className="button" disabled={!ready || busy}>
            {busy
              ? "Saving…"
              : initial
                ? "Save verified changes →"
                : "Publish verified bundle →"}
          </button>
        )}
      </div>
    </form>
  );
}
