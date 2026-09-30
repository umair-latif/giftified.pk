import "server-only";
import { getCommerce } from "@/lib/commerce";
import type { TemplateMeta } from "@/server/templates/types";

export interface DesignPrice {
  pricePkr: number;
  /** Set only while the product is reduced in WooCommerce. */
  regularPricePkr?: number;
}

/**
 * Current WooCommerce prices of the design products among `templates`, by
 * template id. WooCommerce is the source of truth (sale prices included); the
 * adapter caches the reads. A design whose price can't be read is left out and
 * its tile simply shows no price. Never throws.
 */
export async function loadDesignPrices(
  templates: readonly Pick<TemplateMeta, "id" | "product">[],
): Promise<Record<string, DesignPrice>> {
  const entries = await Promise.all(
    templates
      .filter((t) => t.product)
      .map(async (t) => {
        try {
          const info = await getCommerce().getDesignProduct(t.id);
          return info
            ? ([
                t.id,
                {
                  pricePkr: info.pricePkr,
                  ...(info.regularPricePkr
                    ? { regularPricePkr: info.regularPricePkr }
                    : {}),
                },
              ] as const)
            : null;
        } catch {
          return null;
        }
      }),
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}
