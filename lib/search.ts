export const sortOptions = [
  "newest",
  "price_low",
  "price_high",
  "per_piece",
] as const;
export type Sort = (typeof sortOptions)[number];
const keys = [
  "q",
  "size",
  "brand",
  "condition",
  "category",
  "location",
  "max_price",
  "sort",
] as const;
export function searchFilters(
  input: Record<string, string | string[] | undefined>,
) {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const v = input[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, 80);
  }
  if (out.max_price && !/^\d{1,4}(\.\d{1,2})?$/.test(out.max_price))
    delete out.max_price;
  if (out.sort && !sortOptions.includes(out.sort as Sort)) delete out.sort;
  return out;
}
export function discoveryLink(
  current: Record<string, string>,
  patch: Record<string, string | null>,
) {
  const params = new URLSearchParams(current);
  for (const [k, v] of Object.entries(patch))
    if (v === null) params.delete(k);
    else params.set(k, v);
  return "/?" + params.toString() + "#discover";
}
