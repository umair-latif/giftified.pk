import type { ProductId } from "@/config/products";
import type { CatalogProduct } from "@/lib/commerce/types";

/**
 * Home page product cards. Names/notes/images here are display copy only;
 * prices and slugs come from WooCommerce (via the commerce adapter) and
 * "can it be designed" comes from the print config in `src/config/products`.
 *
 * The card picture is the product's first photo in WooCommerce; the
 * `*-placeholder.webp` images in `public/home/` are only the fallback for a
 * product without a photo (or not in the store).
 */
export interface HomeProductInfo {
  productId: ProductId;
  name: string;
  note: string;
  image: string;
}

export const HOME_PRODUCTS: readonly HomeProductInfo[] = [
  {
    productId: "mug",
    name: "Custom Mug",
    note: "11oz white ceramic, full wrap",
    image: "/home/mug-placeholder.webp",
  },
  {
    productId: "tshirt",
    name: "T-Shirt",
    note: "180–200 GSM combed cotton",
    image: "/home/tshirt-placeholder.webp",
  },
  {
    productId: "hoodie",
    name: "Hoodie",
    note: "320+ GSM heavy fleece",
    image: "/home/hoodie-placeholder.webp",
  },
];

export interface HomeProductCard extends HomeProductInfo {
  /** `/products/<slug>` when the product can be designed, else null ("Coming soon"). */
  href: string | null;
  /** Lowest price in PKR, or null when the store didn't return one. */
  fromPricePkr: number | null;
  /** Regular price of the cheapest variant when it is reduced, else null. */
  fromRegularPricePkr: number | null;
}

/** Lowest variant price (the "from" price), falling back to the base price. */
export function fromRegularPrice(product: CatalogProduct): number | null {
  const cheapest = [...product.variants].sort(
    (a, b) => a.pricePkr - b.pricePkr,
  )[0];
  return cheapest?.regularPricePkr ?? null;
}

export function fromPrice(product: CatalogProduct): number {
  const prices = product.variants.map((v) => v.pricePkr);
  return prices.length > 0 ? Math.min(...prices) : product.basePricePkr;
}

/**
 * Merge display copy with the store catalog. A product is clickable only
 * when it has a print config; its slug comes from the catalog (falling back
 * to the product ID when the store didn't list it).
 */
export function buildHomeProductCards(
  catalog: readonly CatalogProduct[],
  hasPrintConfig: (id: ProductId) => boolean,
  products: readonly HomeProductInfo[] = HOME_PRODUCTS,
): HomeProductCard[] {
  return products.map((info) => {
    const entry = catalog.find((p) => p.productId === info.productId);
    const slug = entry?.slug ?? info.productId;
    return {
      ...info,
      image: entry?.images[0]?.src ?? info.image,
      href: hasPrintConfig(info.productId)
        ? `/products/${encodeURIComponent(slug)}`
        : null,
      fromPricePkr: entry ? fromPrice(entry) : null,
      fromRegularPricePkr: entry ? fromRegularPrice(entry) : null,
    };
  });
}
