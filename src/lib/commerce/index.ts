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
    : createMockCommerce();
  return client;
}
