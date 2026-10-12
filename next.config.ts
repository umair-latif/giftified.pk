import type { NextConfig } from "next";

/**
 * Product photos come from the WooCommerce media library (task 11). Allow only
 * that host's uploads folder, derived from WC_URL so there is one source of truth.
 */
function wooImagePatterns(): URL[] {
  try {
    return process.env.WC_URL
      ? [new URL("/wp-content/uploads/**", process.env.WC_URL)]
      : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns: wooImagePatterns() },
  async headers() {
    return [
      {
        // Browsers must always re-check the service worker for updates.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ["192.168.0.32"],
  // The print renderer runs Fabric in Node with the native `canvas` module.
  serverExternalPackages: ["fabric"],
  // Fonts are read from disk at render time, so ship them with the job route.
  outputFileTracingIncludes: {
    "/api/inngest": ["./src/server/print/fonts/**/*"],
  },
};

export default nextConfig;
