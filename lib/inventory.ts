import { configured, db } from "./supabase";
import { photoEntries } from "./photos";
import { searchFilters } from "./search";
export async function inventory(
  filters: Record<string, string | undefined> = {},
) {
  filters = searchFilters(filters);
  if (!configured()) return { items: [], error: null, connected: false };
  const client = await db();
  let query = client
    .from("listings")
    .select("*")
    .eq("status", "active")
    .limit(60);
  if (filters.sort === "price_low" || filters.sort === "price_high")
    query = query.order("price_pence", {
      ascending: filters.sort === "price_low",
    });
  else if (filters.sort === "per_piece")
    query = query.order("unit_price_pence", { ascending: true });
  else query = query.order("created_at", { ascending: false });
  for (const key of ["size", "brand", "condition", "category", "location"])
    if (filters[key])
      query = query.ilike(
        key === "size" ? "size_search" : key,
        ["brand", "size", "location"].includes(key)
          ? `%${(key === "size" ? filters[key]!.replace(/[–—]/g, "-").replace(/\s+/g, " ") : filters[key]!).replace(/[%_\\]/g, "")}%`
          : (key === "size"
              ? filters[key]!.replace(/[–—]/g, "-").replace(/\s+/g, " ")
              : filters[key]!
            ).replace(/[%_\\]/g, ""),
      );
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
  if (data?.length) {
    try {
      const covers = await photoEntries([
        ...new Set(data.flatMap((item) => item.photos?.slice(0, 1) ?? [])),
      ] as string[]);
      const byId = new Map(covers.map((p) => [p.id, p.url]));
      for (const item of data)
        item.cover_url = byId.get(item.photos?.[0]) ?? null;
    } catch {
      return {
        items: [],
        error: "Listing photos are unavailable. Please try again later.",
        connected: true,
      };
    }
  }
  return { items: data ?? [], error: error?.message, connected: true };
}
export const money = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    p / 100,
  );
