import type { BaseColor, ProductConfig, ProductId } from "@/config/products";
import type { CatalogImage, CatalogProduct } from "@/lib/commerce/types";

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
  { productId: "tshirt", name: "T-shirt", spec: "180–200 GSM combed cotton" },
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
  /** Show "from": only when colours or sizes really cost different amounts. */
  priceVaries: boolean;
  image: { src: string; alt: string } | null;
  swatches: Swatch[];
}

/** Lowest variant price ("from Rs …"). */
export function fromPrice(product: CatalogProduct): number {
  const prices = product.variants.map((v) => v.pricePkr);
  return prices.length > 0 ? Math.min(...prices) : product.basePricePkr;
}

/** True when the variants have different prices (then the card says "from"). */
export function priceVaries(product: CatalogProduct): boolean {
  return new Set(product.variants.map((v) => v.pricePkr)).size > 1;
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
      priceVaries: entry ? priceVaries(entry) : false,
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
    brand: { "@type": "Brand", name: "DesignBanana" },
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

// ---------------------------------------------------------------------------
// Product page options (colour, size, price for the selection)
// ---------------------------------------------------------------------------

/**
 * Plain product photos per colour (public/mockups), shown when a colour is
 * picked and WooCommerce has no photo of that colour's variation.
 */
const COLOUR_PHOTOS: Partial<Record<ProductId, Record<string, string>>> = {
  mug: {
    white: "/mockups/mug-front.webp",
    black: "/mockups/mug-front-black.webp",
  },
  tshirt: {
    white: "/mockups/tshirt-front.webp",
    black: "/mockups/tshirt-front-black.webp",
  },
  hoodie: {
    white: "/mockups/hoodie-front.webp",
    grey: "/mockups/hoodie-front-grey.webp",
  },
};

const NOUN: Record<ProductId, string> = {
  mug: "mug",
  tshirt: "T-shirt",
  hoodie: "hoodie",
};

export interface ColourOption {
  id: string;
  name: string;
  hex: string | null;
  /** Main photo for this colour, or null to keep the product gallery as is. */
  photo: CatalogImage | null;
}

export interface VariantOption {
  colourId: string;
  size: string | null;
  pricePkr: number;
  regularPricePkr: number | null;
  inStock: boolean;
}

export interface ProductOptions {
  colours: ColourOption[];
  /** Distinct sizes in store order; empty for products without sizes. */
  sizes: string[];
  variants: VariantOption[];
  /** True when the price depends on the size (then "from" until one is picked). */
  sizeChangesPrice: boolean;
}

/** Colours, sizes and prices for the product page, from WooCommerce + config. */
export function productOptions(
  product: CatalogProduct | undefined,
  productId: ProductId,
  configColours: readonly BaseColor[],
): ProductOptions {
  const variants: VariantOption[] = (product?.variants ?? []).map((v) => ({
    colourId: v.colourId,
    size: v.size ?? null,
    pricePkr: v.pricePkr,
    regularPricePkr: v.regularPricePkr ?? null,
    inStock: v.inStock,
  }));
  const ids = variants.length
    ? [...new Set(variants.map((v) => v.colourId))]
    : configColours.map((c) => c.id);
  const firstId = ids[0];
  const colours = ids.map((id): ColourOption => {
    const cfg = configColours.find((c) => c.id === id);
    const v = product?.variants.find((x) => x.colourId === id);
    const name = v?.colourName ?? cfg?.name ?? id;
    const own = product?.variants.find((x) => x.colourId === id && x.image);
    const fallback = COLOUR_PHOTOS[productId]?.[id];
    const photo: CatalogImage | null = own?.image
      ? {
          src: own.image.src,
          alt: own.image.alt || `${product?.name}, ${name}`,
        }
      : id !== firstId && fallback
        ? {
            src: fallback,
            alt: `Plain ${name.toLowerCase()} ${NOUN[productId]}`,
          }
        : null;
    return { id, name, hex: v?.colourHex ?? cfg?.hex ?? null, photo };
  });
  const sizeList = sizes(product);
  const sizeChangesPrice = colours.some((c) => {
    const p = new Set(
      variants.filter((v) => v.colourId === c.id).map((v) => v.pricePkr),
    );
    return p.size > 1;
  });
  return { colours, sizes: sizeList, variants, sizeChangesPrice };
}

/**
 * Price for the current selection: exact when it's known (or when the size
 * doesn't change the price), else the lowest for that colour with `from`.
 */
export function selectionPrice(
  opts: Pick<ProductOptions, "variants">,
  colourId: string,
  size: string | null,
): { pricePkr: number; regularPricePkr: number | null; from: boolean } | null {
  const forColour = opts.variants.filter((v) => v.colourId === colourId);
  const exact = size ? forColour.find((v) => v.size === size) : undefined;
  if (exact)
    return {
      pricePkr: exact.pricePkr,
      regularPricePkr: exact.regularPricePkr,
      from: false,
    };
  if (forColour.length === 0) return null;
  const cheapest = [...forColour].sort((a, b) => a.pricePkr - b.pricePkr)[0]!;
  const differs = new Set(forColour.map((v) => v.pricePkr)).size > 1;
  return {
    pricePkr: cheapest.pricePkr,
    regularPricePkr: cheapest.regularPricePkr,
    from: differs,
  };
}

/**
 * The product's WooCommerce photos for the gallery: the same photo added twice
 * shows once, and every alt is unique: the Woo alt when it is the photo's own
 * (not just the product name, not shared), else "<name>, photo 2 of 4".
 */
export function productGalleryItems(
  images: readonly CatalogImage[],
  name: string,
): { src: string; alt: string; label: string; className: string }[] {
  const unique = images.filter(
    (img, i) => images.findIndex((o) => o.src === img.src) === i,
  );
  const norm = (a: string) => a.trim().toLowerCase();
  const count = new Map<string, number>();
  for (const img of unique)
    count.set(norm(img.alt), (count.get(norm(img.alt)) ?? 0) + 1);
  return unique.map((img, i) => {
    const own =
      norm(img.alt) !== "" &&
      norm(img.alt) !== norm(name) &&
      count.get(norm(img.alt)) === 1;
    return {
      src: img.src,
      alt: own ? img.alt.trim() : `${name}, photo ${i + 1} of ${unique.length}`,
      label: `Photo ${i + 1}`,
      className: "object-cover",
    };
  });
}
