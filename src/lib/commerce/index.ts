import "server-only";
import { createMockCommerce } from "./mock";
import type { CommerceClient } from "./types";
import { createWooCommerceClient, wooConfigFromEnv } from "./woocommerce";

export type * from "./types";

let client: CommerceClient | undefined;

/**
 * The one entry point for store access: WooCommerce when `WC_URL` is set
 * (then WC_CONSUMER_KEY / _SECRET / WC_WEBHOOK_SECRET are required too),
 * otherwise the in-memory mock for local development.
 */
export function getCommerce(): CommerceClient {
  client ??= process.env.WC_URL
    ? createWooCommerceClient(wooConfigFromEnv())
    : mockOrFail();
  return client;
}

/**
 * In production a missing WC_URL is a misconfiguration, not "use the mock":
 * the mock keeps orders in memory (customers would be told their order was
 * placed and it would vanish) and accepts unsigned webhooks. Fail loudly
 * instead. `COMMERCE_MOCK=1` opts in explicitly (e2e tests, demos).
 */
function mockOrFail(
  env: Record<string, string | undefined> = process.env,
): CommerceClient {
  if (env.NODE_ENV === "production" && env.COMMERCE_MOCK !== "1") {
    throw new Error(
      "WC_URL is not set in production. Configure WooCommerce (see .env.example) or set COMMERCE_MOCK=1 for a demo build.",
    );
  }
  return createMockCommerce();
}

export const __test = { mockOrFail };
