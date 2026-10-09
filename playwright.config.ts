import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  // CI: retry a failed test once, so a one-off timing failure doesn't block a
  // merge. A test that only passes on the retry is reported as "flaky" (a
  // warning on the PR) — fix it, don't ignore it.
  retries: process.env.CI ? 1 : 0,
  // CI: "github" writes each failure (and flaky test) as an annotation on the
  // PR, readable without downloading the report; "html" fills the
  // playwright-report artifact; "list" keeps the step log readable.
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    // Keep a trace of a failed test's retry: the artifact then shows each step.
    trace: process.env.CI ? "on-first-retry" : "off",
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
    env: {
      COMMERCE_MOCK: "1",
      TEMPLATE_EDITOR_EMAILS: "template-editor@example.pk",
    },
  },
});
