/**
 * pnpm woo:smoke — runs the live WooCommerce check (tests/unit/commerce-staging.test.ts)
 * against the store in .env.local. Works the same in PowerShell, cmd and bash.
 * It creates ONE real test order (On hold); cancel or delete it in WP admin afterwards.
 */
import { spawnSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
if (!process.env.WC_URL) {
  console.error("Set WC_URL and the WooCommerce keys in .env.local first.");
  process.exit(1);
}
const result = spawnSync(
  "pnpm",
  ["vitest", "run", "tests/unit/commerce-staging.test.ts"],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, WC_SMOKE: "1" },
  },
);
process.exit(result.status ?? 1);
