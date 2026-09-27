import "server-only";
import { createMockCommerce } from "./mock";
import type { CommerceClient } from "./types";

export type * from "./types";

let client: CommerceClient | undefined;

/**
 * The one entry point for store access. Uses the mock until WooCommerce env
 * vars are set; the WooCommerce task wires `createWooCommerceClient` in here.
 */
export function getCommerce(): CommerceClient {
  client ??= createMockCommerce();
  return client;
}
