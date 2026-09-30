import "server-only";
import { getCommerce } from "@/lib/commerce";
import type { TemplateMeta } from "@/server/templates/types";

export interface DesignPrice {
  pricePkr: number;
  /** Set only while the product is reduced in WooCommerce. */
  regularPricePkr?: number;
}

export interface LiveDesigns<T> {
  /** `templates` without the design products that no longer exist in WooCommerce. */
  templates: T[];
  /** Current WooCommerce prices of the design products, by template id. */
  prices: Record<string, DesignPrice>;
}

/**
 * WooCommerce is the source of truth for design products (task 26): the
 * template lives in our storage, but the product, its price and whether it is
 * for sale live in WooCommerce. When the shop owner deletes, trashes or
 * unpublishes the product in WP admin, the template must disappear from the
 * shop too, so listings pass through here.
 *
 * - Plain templates (no product) are always kept.
 * - A design product WooCommerce says is gone (lookup answers "none") is dropped.
 * - A lookup that FAILS (WooCommerce down, no store in a CI build) keeps the
 *   template, without a price: an outage must not empty the shop.
 *
 * The adapter caches the reads, so this is cheap. Never throws.
 */
export async function withLiveDesigns<
  T extends Pick<TemplateMeta, "id" | "product">,
>(templates: readonly T[]): Promise<LiveDesigns<T>> {
  const prices: Record<string, DesignPrice> = {};
  const checked = await Promise.all(
    templates.map(async (t) => {
      if (!t.product) return true;
      try {
        const info = await getCommerce().getDesignProduct(t.id);
        if (!info) return false;
        prices[t.id] = {
          pricePkr: info.pricePkr,
          ...(info.regularPricePkr
            ? { regularPricePkr: info.regularPricePkr }
            : {}),
        };
        return true;
      } catch {
        return true;
      }
    }),
  );
  return { templates: templates.filter((_, i) => checked[i]), prices };
}
