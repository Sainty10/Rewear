import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return ["180", "192", "512"].map((size) => ({ size }));
}

// The existing Rewear mark, inset into the safe area for maskable app icons.
const mark = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64"><rect width="64" height="64" fill="#08714e"/><g transform="translate(8 8) scale(.75)"><path d="M18 45V21h8v5c3-5 8-6 13-5v9c-8-2-13 1-13 9v6z" fill="#e8ff96"/><path d="M42 35h11m-5-5 5 5-5 5" stroke="#ffd680" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!["180", "192", "512"].includes(size)) {
    return new Response("Not found", { status: 404 });
  }
  const png = await sharp(Buffer.from(mark))
    .resize(Number(size), Number(size))
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
