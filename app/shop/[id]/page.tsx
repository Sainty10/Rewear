import { configured, db } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { money } from "@/lib/inventory";
export default async function Shop({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured()) notFound();
  const { id } = await params;
  const c = await db();
  const { data: p } = await c
    .from("profiles")
    .select("id,display_name,bio,town")
    .eq("id", id)
    .single();
  if (!p) notFound();
  const { data: listings } = await c
    .from("listings")
    .select("id,title,quantity,size,price_pence")
    .eq("seller_id", id)
    .eq("status", "active");
  return (
    <main className="page">
      <div className="eyebrow">A WARDROBE WITH MORE TO GIVE</div>
      <h1>{p.display_name}’s storefront</h1>
      <p>{p.town}</p>
      <p className="pre-wrap">{p.bio}</p>
      <section className="panel">
        <h2>Available bundles</h2>
        {listings?.length ? (
          listings.map((l) => (
            <Link className="row" key={l.id} href={`/listing/${l.id}`}>
              <div>
                <strong>{l.title}</strong>
                <p>
                  {l.quantity} pieces · {l.size}
                </p>
              </div>
              <span>{money(l.price_pence)} →</span>
            </Link>
          ))
        ) : (
          <p>No available bundles yet.</p>
        )}
      </section>
    </main>
  );
}
