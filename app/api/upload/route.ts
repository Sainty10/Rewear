import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { authenticated, admin } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const { client, user } = await authenticated();
    const { error: limit } = await client.rpc("claim_usage", {
      p_action: "upload",
    });
    if (limit) throw new Error("Upload limit reached. Please try again later.");
    const storage = admin();
    if (Number(req.headers.get("content-length")) > 9 * 1024 * 1024)
      throw new Error("Image too large");
    const f = await req.formData();
    const file = f.get("photo");
    if (
      !(file instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    )
      throw new Error("Use a JPEG, PNG or WebP photo under 8 MB");
    const bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 25000000,
    })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}.webp`;
    const { error } = await storage.storage
      .from("listing-photos")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    const result = await storage
      .from("photos")
      .insert({ id, owner_id: user.id, path });
    if (result.error) throw result.error;
    const { data } = await client.storage
      .from("listing-photos")
      .createSignedUrl(path, 3600);
    return NextResponse.json({ id, url: data?.signedUrl });
  } catch (e) {
    return failure(e);
  }
}
