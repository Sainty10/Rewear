import { configured, db } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import SellForm from "../sell-form";
import { photoEntries } from "@/lib/photos";
import type { EditableBundle } from "@/lib/listing-types";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Edit your bundle | Rewear",
  robots: { index: false, follow: false },
};
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!configured()) redirect("/auth");
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const c = await db();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) redirect("/auth");
  const { data: l } = await c
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .eq("status", "active")
    .single();
  if (!l) notFound();
  const photos = await photoEntries(l.photos);
  const initial: EditableBundle = {
    id: l.id,
    title: l.title,
    description: l.description,
    category: l.category,
    size: l.size,
    brand: l.brand,
    condition: l.condition,
    location: l.location,
    pickup: l.pickup,
    price_pence: l.price_pence,
    items: l.items,
    photos,
  };
  return (
    <main className="page narrow">
      <div className="eyebrow">GET EVERY DETAIL RIGHT</div>
      <h1>Polish your bundle.</h1>
      <p className="muted">
        You can edit an available bundle. Details are frozen as soon as a buyer
        reserves it. Check the full listing again before saving.
      </p>
      <SellForm initial={initial} />
    </main>
  );
}
