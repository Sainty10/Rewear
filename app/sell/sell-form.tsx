"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function SellForm() {
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const router = useRouter();
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      const added: { id: string; url: string }[] = [];
      for (const file of Array.from(files).slice(0, 8 - photos.length)) {
        const f = new FormData();
        f.set("photo", file);
        const r = await fetch("/api/upload", { method: "POST", body: f });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        added.push(d);
      }
      setPhotos((p) => [...p, ...added]);
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
      setDraft(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = {
      ...Object.fromEntries(f),
      price_pence: Math.round(Number(f.get("price")) * 100),
      pickup: f.get("pickup") === "on",
      verified: f.get("verified") === "on",
      photos: photos.map((p) => p.id),
    };
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", ...body }),
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
    <form className="stack panel" onSubmit={submit}>
      <label>
        1. Add clear photos (up to 8)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || photos.length >= 8}
          onChange={(e) => upload(e.target.files)}
        />
      </label>
      <small className="muted">
        Photograph clothes only. Avoid faces, names, school badges and
        addresses. Maximum 8 MB per photo; image metadata is removed before
        upload.
      </small>
      <div className="photos">
        {photos.map((p) => (
          <div key={p.id}>
            <img src={p.url} alt="Your uploaded clothing" />
            <button
              type="button"
              onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}
            >
              Remove
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
        ✦ Assist with a listing draft
      </button>
      <small className="muted">
        Optional AI assistance sends clothing photos to OpenAI. Review all
        suggestions. Brand, size, condition and quantity must be entered by you.
      </small>
      <label>
        Title
        <input
          name="title"
          required
          minLength={8}
          maxLength={120}
          value={draft.title ?? ""}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={4000}
          value={draft.description ?? ""}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </label>
      <div className="form-grid">
        <label>
          Category
          <select name="category">
            {["Baby", "Kids", "Women", "Men", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Size / size range
          <input
            name="size"
            placeholder="e.g. 2–3 years"
            required
            maxLength={40}
          />
        </label>
        <label>
          Brand(s)
          <input
            name="brand"
            required
            maxLength={80}
            placeholder="Mixed brands"
          />
        </label>
        <label>
          Condition
          <select name="condition">
            {["New with tags", "Like new", "Good", "Fair"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Number of pieces
          <input name="quantity" type="number" min={1} max={100} required />
        </label>
        <label>
          Bundle price (£)
          <input
            name="price"
            type="number"
            min={1}
            max={1000}
            step="0.01"
            required
          />
        </label>
      </div>
      <label>
        Town (never your full address)
        <input name="location" required minLength={2} maxLength={80} />
      </label>
      <label className="check">
        <input name="pickup" type="checkbox" />
        Offer local pickup. Arrange a public meeting place in order messaging;
        never publish a home address.
      </label>
      <label className="check">
        <input name="verified" type="checkbox" required />I checked the photos,
        size, quantity, condition and description. I own these items and have
        disclosed defects. This listing contains clothing only and no personal
        information.
      </label>
      <p className="muted">
        Rewear commission: 10% of the bundle price. Stripe processing fees are
        charged to the platform. Shipping is arranged separately in this initial
        release; no shipping charge is included at checkout.
      </p>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <button className="button" disabled={busy || !photos.length}>
        {busy ? "Working…" : "Publish verified bundle →"}
      </button>
    </form>
  );
}
