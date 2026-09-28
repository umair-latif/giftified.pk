import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    // Optional: point at a preinstalled Chromium instead of `playwright install`.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
    baseURL: `http://localhost:${PORT}`,
    // Low/mid-range Android baseline: 360px wide, touch, 3x DPR.
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  },
  webServer: {
    command: `pnpm start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    // e2e runs a production build without WooCommerce: opt in to the mock store.
    env: { COMMERCE_MOCK: "1" },
  },
});
