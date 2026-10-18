import { z } from "zod";
export const conditions = [
  "New with tags",
  "Like new",
  "Good",
  "Fair",
] as const;
export const listingSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(20).max(4000),
  category: z.enum(["Baby", "Kids", "Women", "Men", "Other"]),
  size: z.string().trim().min(1).max(40),
  brand: z.string().trim().min(1).max(80),
  condition: z.enum(conditions),
  quantity: z.coerce.number().int().min(1).max(100),
  price_pence: z.coerce.number().int().min(100).max(100000),
  location: z.string().trim().min(2).max(80),
  pickup: z.boolean(),
  photos: z.array(z.string().uuid()).min(1).max(8),
  verified: z.literal(true),
});
export function commission(total: number) {
  if (!Number.isSafeInteger(total) || total < 100)
    throw new Error("Invalid amount");
  const platform = Math.round(total * 0.1);
  return { total, platform, seller: total - platform };
}
export function safeNext(path: string | null) {
  return path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : "/account";
}
export function matchesSearch(
  l: Record<string, unknown>,
  f: Record<string, unknown>,
) {
  return (
    ["size", "brand", "condition", "category", "location"].every(
      (k) =>
        !f[k] ||
        String(l[k]).toLowerCase().includes(String(f[k]).toLowerCase()),
    ) &&
    (!f.max_price || Number(l.price_pence) <= Number(f.max_price))
  );
}
