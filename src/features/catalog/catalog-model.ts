import type { BaseColor, ProductConfig, ProductId } from "@/config/products";
import type { CatalogProduct } from "@/lib/commerce/types";

/**
 * Catalog view model. WooCommerce supplies names, prices, images, slugs and
 * colours; `src/config/products` decides whether a product can be designed
 * (print geometry exists). Display copy for products WooCommerce doesn't list
 * yet lives here so the catalog still shows them as "Coming soon".
 */

export interface CatalogInfo {
  productId: ProductId;
  name: string;
  /** One-line spec shown on cards. */
  spec: string;
}

export const CATALOG_INFO: readonly CatalogInfo[] = [
  {
    productId: "mug",
    name: "Custom Mug",
    spec: "11oz gloss ceramic · full wrap",
  },
  { productId: "tshirt", name: "T-Shirt", spec: "180–200 GSM combed cotton" },
  { productId: "hoodie", name: "Hoodie", spec: "320+ GSM heavy fleece" },
];

export interface Swatch {
  name: string;
  hex: `#${string}` | null;
}

export interface CatalogCard {
  productId: ProductId;
  name: string;
  spec: string;
  /** `/products/<slug>` when the product can be designed, else null ("Coming soon"). */
  href: string | null;
  fromPricePkr: number | null;
  /** Regular price of that cheapest variant when it is reduced, else null. */
  fromRegularPricePkr: number | null;
  image: { src: string; alt: string } | null;
  swatches: Swatch[];
}

/** Lowest variant price ("from Rs …"). */
export function fromPrice(product: CatalogProduct): number {
  const prices = product.variants.map((v) => v.pricePkr);
  return prices.length > 0 ? Math.min(...prices) : product.basePricePkr;
}

/** Regular price of the cheapest variant, only when it is reduced (a sale). */
export function fromRegularPrice(product: CatalogProduct): number | null {
  const cheapest = [...product.variants].sort(
    (a, b) => a.pricePkr - b.pricePkr,
  )[0];
  return cheapest?.regularPricePkr ?? null;
}

/**
 * One swatch per colour, in variant order. WooCommerce name/hex first, then
 * the product config's base colours; with no catalog entry at all, the config
 * colours alone.
 */
export function swatches(
  product: CatalogProduct | undefined,
  configColours: readonly BaseColor[] = [],
): Swatch[] {
  const out: Swatch[] = [];
  const seen = new Set<string>();
  for (const v of product?.variants ?? []) {
    if (seen.has(v.colourId)) continue;
    seen.add(v.colourId);
    const cfg = configColours.find((c) => c.id === v.colourId);
    out.push({
      name: v.colourName ?? cfg?.name ?? v.colourId,
      hex: v.colourHex ?? cfg?.hex ?? null,
    });
  }
  if (out.length === 0)
    for (const c of configColours) out.push({ name: c.name, hex: c.hex });
  return out;
}

/** Distinct sizes in variant order (apparel). */
export function sizes(product: CatalogProduct | undefined): string[] {
  return [
    ...new Set(
      (product?.variants ?? []).flatMap((v) => (v.size ? [v.size] : [])),
    ),
  ];
}

export function slugFor(
  productId: ProductId,
  catalog: readonly CatalogProduct[],
) {
  return catalog.find((p) => p.productId === productId)?.slug || productId;
}

export function buildCatalogCards(
  catalog: readonly CatalogProduct[],
  config: (id: ProductId) => ProductConfig | null,
  info: readonly CatalogInfo[] = CATALOG_INFO,
): CatalogCard[] {
  return info.map((i) => {
    const entry = catalog.find((p) => p.productId === i.productId);
    const cfg = config(i.productId);
    const img = entry?.images[0];
    return {
      productId: i.productId,
      name: entry?.name ?? i.name,
      spec: i.spec,
      href: cfg
        ? `/products/${encodeURIComponent(slugFor(i.productId, catalog))}`
        : null,
      fromPricePkr: entry ? fromPrice(entry) : null,
      fromRegularPricePkr: entry ? fromRegularPrice(entry) : null,
      image: img ? { src: img.src, alt: img.alt } : null,
      swatches: swatches(entry, cfg?.baseColors),
    };
  });
}

export type SlugMatch =
  | { kind: "found"; productId: ProductId; product: CatalogProduct | undefined }
  | { kind: "redirect"; to: string }
  | { kind: "none" };

/**
 * `/products/[slug]` → product. The WooCommerce slug is canonical (e.g.
 * `custom-mug`); the product id (`mug`) also works and redirects to it, so
 * links built before the catalog loads never break. Only products with a
 * print config have a page.
 */
export function resolveSlug(
  slug: string,
  catalog: readonly CatalogProduct[],
  hasConfig: (id: ProductId) => boolean,
): SlugMatch {
  const bySlug = catalog.find((p) => p.slug === slug);
  if (bySlug)
    return hasConfig(bySlug.productId)
      ? { kind: "found", productId: bySlug.productId, product: bySlug }
      : { kind: "none" };
  const info = CATALOG_INFO.find((i) => i.productId === slug);
  if (!info || !hasConfig(info.productId)) return { kind: "none" };
  const product = catalog.find((p) => p.productId === info.productId);
  if (product?.slug && product.slug !== slug)
    return {
      kind: "redirect",
      to: `/products/${encodeURIComponent(product.slug)}`,
    };
  return { kind: "found", productId: info.productId, product };
}

/** schema.org Product with an Offer in PKR (Google rich results). */
export function productJsonLd(
  product: CatalogProduct,
  url: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.productId,
    url,
    ...(product.shortDescription
      ? { description: product.shortDescription }
      : {}),
    ...(product.images.length
      ? { image: product.images.map((i) => i.src) }
      : {}),
    brand: { "@type": "Brand", name: "Giftified.pk" },
    offers: {
      "@type": "Offer",
      price: fromPrice(product),
      priceCurrency: "PKR",
      availability: product.variants.some((v) => v.inStock)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url,
    },
  };
}

/** JSON for a <script type="application/ld+json">, safe against `</script>`. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
