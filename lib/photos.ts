import { admin } from "./supabase";
export async function listingPhotos(ids: string[]) {
  if (!ids?.length) return [];
  const a = admin();
  const { data } = await a.from("photos").select("path").in("id", ids);
  const urls = [];
  for (const p of data ?? []) {
    const { data: s } = await a.storage
      .from("listing-photos")
      .createSignedUrl(p.path, 900);
    if (s) urls.push(s.signedUrl);
  }
  return urls;
}
