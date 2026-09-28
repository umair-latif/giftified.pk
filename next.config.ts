import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.32"],
  // The print renderer runs Fabric in Node with the native `canvas` module.
  serverExternalPackages: ["fabric"],
  // Fonts are read from disk at render time, so ship them with the job route.
  outputFileTracingIncludes: {
    "/api/inngest": ["./src/server/print/fonts/**/*"],
  },
};

export default nextConfig;
