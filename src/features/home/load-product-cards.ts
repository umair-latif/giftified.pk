import "server-only";
import { getProduct } from "@/config/products";
import { getCommerce, type CatalogProduct } from "@/lib/commerce";
import { buildHomeProductCards, type HomeProductCard } from "./product-cards";

/**
 * Product cards for the home page. Catalog reads are cached by the adapter
 * (Next data cache). If the store can't be reached — e.g. a CI build without
 * WooCommerce credentials — the page still renders, just without prices, and
 * ISR fills them in on the next revalidation.
 */
export async function loadHomeProductCards(): Promise<HomeProductCard[]> {
  let catalog: CatalogProduct[] = [];
  try {
    catalog = await getCommerce().listProducts();
  } catch (err) {
    console.warn(
      "[home] catalog unavailable, rendering without prices:",
      err instanceof Error ? err.message : err,
    );
  }
  return buildHomeProductCards(catalog, (id) => getProduct(id) !== null);
}
