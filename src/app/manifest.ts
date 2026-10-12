import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/**
 * The installed app ("Add to Home screen" / "Install app"). Icons come from
 * `python3 scripts/build-app-icons.py`. Theme colour matches the viewport's
 * `themeColor` in the root layout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE.name,
    short_name: SITE.name,
    description: `${SITE.name}: design your own mug, T-shirt or hoodie and pay cash on delivery.`,
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#14b8a6",
    categories: ["shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the app icon on Android.
    shortcuts: [
      { name: "Design a mug", url: "/design/mug" },
      { name: "Design a T-shirt", url: "/design/tshirt" },
      { name: "Design a hoodie", url: "/design/hoodie" },
      { name: "Track your order", url: "/track" },
    ],
  };
}
