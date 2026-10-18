import { admin } from "./supabase";
export async function photoEntries(ids: string[]) {
  if (!ids?.length) return [];
  const a = admin();
  const { data, error } = await a
    .from("photos")
    .select("id,path")
    .in("id", ids);
  if (error) throw new Error("Photos could not be loaded");
  const paths = ids
    .map((id) => data?.find((p) => p.id === id))
    .filter((p): p is { id: string; path: string } => !!p);
  if (!paths.length) return [];
  const { data: links, error: signError } = await a.storage
    .from("listing-photos")
    .createSignedUrls(
      paths.map((p) => p.path),
      900,
    );
  if (signError) throw new Error("Photos could not be loaded");
  return paths.flatMap((p, i) =>
    links?.[i]?.signedUrl ? [{ id: p.id, url: links[i].signedUrl }] : [],
  );
}
export async function listingPhotos(ids: string[]) {
  return (await photoEntries(ids)).map((p) => p.url);
}
