import { configured, db } from "./supabase";
import { listingPhotos } from "./photos";
export async function inventory(
  filters: Record<string, string | undefined> = {},
) {
  if (!configured()) return { items: [], error: null, connected: false };
  const client = await db();
  let query = client
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);
  for (const key of ["size", "brand", "condition", "category", "location"])
    if (filters[key])
      query = query.ilike(key, filters[key]!.replace(/[%_]/g, "").slice(0, 80));
  if (filters.q)
    query = query.ilike(
      "title",
      `%${filters.q.replace(/[%_]/g, "").slice(0, 80)}%`,
    );
  if (filters.max_price && Number.isFinite(Number(filters.max_price)))
    query = query.lte(
      "price_pence",
      Math.round(Number(filters.max_price) * 100),
    );
  const { data, error } = await query;
  for (const item of data ?? []) {
    item.cover_url = (await listingPhotos(item.photos?.slice(0, 1)))[0] ?? null;
  }
  return { items: data ?? [], error: error?.message, connected: true };
}
export const money = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    p / 100,
  );
