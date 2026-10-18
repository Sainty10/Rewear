import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!process.env.APP_URL) return [];
  return ["/", "/how-it-works", "/safety"].map((path) => ({
    url: new URL(path, process.env.APP_URL).href,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.6,
  }));
}
