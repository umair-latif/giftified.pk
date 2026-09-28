import "server-only";
import { getCommerce, type CatalogProduct } from "@/lib/commerce";

/**
 * The catalog for storefront pages. Reads are cached by the adapter (Next data
 * cache, tag "catalog", 1 hour). If the store can't be reached — e.g. a build
 * without WooCommerce credentials — pages still render, just without prices,
 * and ISR fills them in on the next revalidation.
 */
export async function loadCatalog(): Promise<CatalogProduct[]> {
  try {
    return await getCommerce().listProducts();
  } catch (err) {
    console.warn(
      "[catalog] store unavailable, rendering without store data:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
