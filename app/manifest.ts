import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rewear",
    short_name: "Rewear",
    description: "A little outgrown. A lot to love. Buy and sell pre-loved clothing bundles.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#08714e",
    icons: [
      { src: "/app-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Sell a bundle", url: "/sell", description: "Give good clothes another chapter." },
      { name: "My Rewear", url: "/account", description: "Your bundles, offers and messages." },
    ],
  };
}
