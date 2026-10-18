import Link from "next/link";
import BundleCalculator from "./components/pricing";
import { searchFilters, discoveryLink } from "@/lib/search";
import { inventory, money } from "@/lib/inventory";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const filters = searchFilters(await searchParams);
  const { items, error, connected } = await inventory(filters);
  return (
    <main>
      <div className="announcement">
        SMALLER FOOTPRINTS. BIGGER POSSIBILITIES.{" "}
        <span>Meet your family’s next favourites →</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="dot" /> GOOD CLOTHES. NEXT CHAPTER.
          </div>
          <h1>
            A little outgrown.
            <br />A lot to <em>love.</em>
          </h1>
          <p>
            Little wardrobes, big possibilities. Buy and sell
            <br className="desktop" /> pre-loved clothing bundles for every
            growing chapter.
          </p>
          <div className="hero-buttons">
            <a className="button" href="#discover">
              Find their next favourites <span>→</span>
            </a>
            <Link className="text-link" href="/sell">
              Make room. Sell a bundle →
            </Link>
          </div>
          <div className="hero-proof">
            <span>↺ Made to be worn again</span>
            <span>♡ Bundled with care</span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Illustration of a collection of children's clothing"
        >
          <div className="art-label">
            THE GROWING-UP EDIT <span>MADE FOR MORE</span>
          </div>
          <div className="sun" />
          <div className="shirt">
            <div className="shirt-neck" />
            <span>
              little
              <br />
              adventures
            </span>
            <i>✳</i>
          </div>
          <div className="trousers">
            <i />
            <b />
          </div>
          <div className="sock sock-one" />
          <div className="sock sock-two" />
          <div className="art-note">
            More adventures.
            <br />
            Less brand new. <span>→</span>
          </div>
          <div className="floating-tag">
            a new chapter
            <br />
            <strong>for every little explorer</strong>
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <span>✦ Less listing. More living.</span>
        <span>▧ One bundle. A whole new wardrobe.</span>
        <span>↺ Better for your budget & the planet.</span>
      </section>
      <section className="section categories">
        <div className="section-heading">
          <div>
            <div className="eyebrow">GROWING TOGETHER</div>
            <h2>Every age. Every adventure.</h2>
          </div>
          <Link className="text-link" href="/#discover">
            Explore all bundles →
          </Link>
        </div>
        <div className="category-grid">
          {[
            {
              name: "Baby",
              age: "Tiny beginnings · 0–24 months",
              icon: "☁",
              color: "peach",
            },
            {
              name: "Kids",
              age: "Big little adventures · 2–12 years",
              icon: "✳",
              color: "sage",
            },
            {
              name: "Women",
              age: "Everyday favourites, rediscovered",
              icon: "☀",
              color: "lavender",
            },
            {
              name: "Men",
              age: "Good staples. Great next chapters.",
              icon: "→",
              color: "sand",
            },
          ].map((c) => (
            <Link
              href={`/?category=${c.name}#discover`}
              className={`category ${c.color}`}
              key={c.name}
            >
              <span className="category-icon">{c.icon}</span>
              <div>
                <h3>{c.name}</h3>
                <p>{c.age}</p>
              </div>
              <span>→</span>
            </Link>
          ))}
        </div>
      </section>
      <section id="discover" className="section discover">
        <div className="section-heading">
          <div>
            <div className="eyebrow">PRE-LOVED. RE-LOVED.</div>
            <h2>
              {filters.category
                ? `${filters.category}’s next chapter`
                : "Good finds, all bundled up."}
            </h2>
            <p className="muted">
              Real wardrobes from real people. A little something to grow into.
            </p>
          </div>
          <Link href="/account" className="text-link">
            ♡ Your saved finds
          </Link>
        </div>
        <div className="quick-sizes" aria-label="Shop popular family sizes">
          <span>Growing into a new size?</span>
          {[
            "0–3 months",
            "3–6 months",
            "6–12 months",
            "1–2 years",
            "2–3 years",
            "3–4 years",
            "4–5 years",
          ].map((size) => (
            <Link
              key={size}
              href={discoveryLink(filters, {
                size,
                category: size.includes("months") ? "Baby" : "Kids",
              })}
              aria-current={filters.size === size ? "true" : undefined}
            >
              {size}
            </Link>
          ))}
        </div>
        <form className="filters" action="/#discover">
          <label className="search-label">
            <span>⌕</span>
            <input
              aria-label="Search clothing bundles"
              name="q"
              placeholder="Try ‘winter essentials’"
              defaultValue={filters.q}
            />
          </label>
          <select
            aria-label="Category"
            name="category"
            defaultValue={filters.category ?? ""}
          >
            <option value="">All categories</option>
            {["Baby", "Kids", "Women", "Men", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            name="size"
            placeholder="Size"
            aria-label="Size"
            defaultValue={filters.size}
          />
          <input
            name="brand"
            placeholder="Brand"
            aria-label="Brand"
            defaultValue={filters.brand}
          />
          <select
            name="condition"
            aria-label="Condition"
            defaultValue={filters.condition ?? ""}
          >
            <option value="">Condition</option>
            {["New with tags", "Like new", "Good", "Fair"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            name="max_price"
            placeholder="Max £"
            aria-label="Maximum price"
            defaultValue={filters.max_price}
          />
          <input
            name="location"
            placeholder="Town"
            aria-label="Town"
            defaultValue={filters.location}
          />
          <select
            name="sort"
            aria-label="Sort bundles"
            defaultValue={filters.sort ?? "newest"}
          >
            <option value="newest">Newest first</option>
            <option value="price_low">Lowest price</option>
            <option value="price_high">Highest price</option>
            <option value="per_piece">Lowest price / piece</option>
          </select>
          <button className="button small">Find bundles</button>
        </form>
        <div className="filter-summary">
          <span>
            {error
              ? "Inventory unavailable"
              : items.length === 60
                ? "Showing the first 60 matching bundles"
                : `${items.length} ${items.length === 1 ? "bundle" : "bundles"} found`}
          </span>
          {Object.entries(filters).some(([k, v]) => k !== "sort" && v) && (
            <Link href="/#discover">Clear filters</Link>
          )}
          <Link href="/account">Save a search for new arrivals →</Link>
        </div>
        {error ? (
          <div className="notice error">
            Inventory is unavailable. Please try again later.
          </div>
        ) : items.length ? (
          <div className="listing-grid">
            {items.map((item) => (
              <Link
                key={item.id}
                className="listing-card"
                href={`/listing/${item.id}`}
              >
                <div className="listing-photo">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} />
                  ) : (
                    <span>Photo pending</span>
                  )}
                  <span className="quantity">{item.quantity} pieces</span>
                </div>
                <div className="listing-meta">
                  {item.size} · {item.condition}
                </div>
                <h3>{item.title}</h3>
                <div className="listing-bottom">
                  <div>
                    <strong>{money(item.price_pence)}</strong>
                    <span className="per-piece">
                      {money(item.price_pence / item.quantity)} / piece
                    </span>
                  </div>
                  <span>{item.location}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">→</div>
            <div className="eyebrow">ROOM FOR SOMETHING GOOD</div>
            <h3>
              {Object.values(filters).some(Boolean)
                ? "No bundles match just yet."
                : "The next chapter starts with you."}
            </h3>
            <p>
              {connected
                ? "Be the first to share a bundle, or save your search for new arrivals."
                : "Our marketplace is getting its wardrobe ready. No sample listings — just real finds when sellers join."}
            </p>
            <div className="empty-actions">
              <Link href="/sell" className="button">
                List your first bundle →
              </Link>
              <Link href="/account" className="text-link">
                Save a search →
              </Link>
            </div>
            {!connected && (
              <small>
                We are preparing the first seller accounts. Transactions are not
                enabled yet.
              </small>
            )}
          </div>
        )}
      </section>
      <BundleCalculator />
      <section className="selling-banner">
        <div>
          <div className="eyebrow">OUTGROWN DOESN’T MEAN OUTWORN</div>
          <h2>
            Their next wardrobe.
            <br />
            Your next clear-out.
          </h2>
          <p>A few photos. One lovely bundle. More room for what’s next.</p>
          <Link className="button light" href="/sell">
            Give good clothes a new home →
          </Link>
        </div>
        <div className="banner-doodle">
          wear.
          <br />
          <em>share.</em>
          <br />
          repeat. <span>↺</span>
        </div>
      </section>
      <section className="section how">
        <div className="eyebrow">A LITTLE EASIER, ALL ROUND</div>
        <h2>Less faff. More second chances.</h2>
        <div className="steps">
          {[
            [
              "01",
              "Snap & bundle",
              "Upload your photos. Get an AI-assisted draft, then check every detail yourself.",
            ],
            [
              "02",
              "Find your people",
              "Search by size, style and budget. Save the finds that feel like you.",
            ],
            [
              "03",
              "Pass the good on",
              "Pay securely through Stripe or arrange a privacy-conscious local pickup.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
