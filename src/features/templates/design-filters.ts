import type { ProductId } from "@/config/products";
import { OCCASION_SLUGS, type OccasionSlug } from "@/server/templates/types";

/** Filters on /designs, from the query string (unknown values are ignored). */
export interface DesignFilters {
  product?: ProductId;
  occasion?: OccasionSlug;
}

const PRODUCT_IDS: readonly ProductId[] = ["mug", "tshirt", "hoodie"];

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parseDesignFilters(
  params: Record<string, string | string[] | undefined>,
): DesignFilters {
  const product = first(params.product);
  const occasion = first(params.occasion);
  return {
    ...(product && (PRODUCT_IDS as readonly string[]).includes(product)
      ? { product: product as ProductId }
      : {}),
    ...(occasion && (OCCASION_SLUGS as readonly string[]).includes(occasion)
      ? { occasion: occasion as OccasionSlug }
      : {}),
  };
}

/** "/designs", "/designs?product=mug", "/designs?product=mug&occasion=eid". */
export function designsHref(f: DesignFilters = {}): string {
  const q = new URLSearchParams();
  if (f.product) q.set("product", f.product);
  if (f.occasion) q.set("occasion", f.occasion);
  const s = q.toString();
  return s ? `/designs?${s}` : "/designs";
}

/** A design's occasions; one saved without any counts as "Everyday". */
export function occasionsOf(t: {
  occasions: readonly string[];
}): readonly string[] {
  return t.occasions.length > 0 ? t.occasions : ["everyday"];
}

export type DesignSort = "newest" | "price-asc" | "price-desc";

export const DESIGN_SORTS: readonly { id: DesignSort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

/** What the catalog needs to filter, search and sort a design. */
export interface CatalogDesign {
  id: string;
  name: string;
  productId: ProductId;
  productName: string;
  occasions: readonly string[];
  /** Occasion labels, for search ("eid" finds "Eid"). */
  occasionLabels: readonly string[];
  pricePkr: number | null;
  createdAt: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Designs matching the product, occasion and search text (name, product or
 * occasion; every word must match), sorted. Pure, so the server render and
 * the browser agree.
 */
export function selectDesigns<T extends CatalogDesign>(
  designs: readonly T[],
  f: { product?: string; occasion?: string; q?: string; sort?: DesignSort },
): T[] {
  const words = norm(f.q ?? "")
    .split(" ")
    .filter(Boolean);
  const out = designs.filter((d) => {
    if (f.product && d.productId !== f.product) return false;
    if (f.occasion && !d.occasions.includes(f.occasion)) return false;
    if (words.length === 0) return true;
    const hay = norm([d.name, d.productName, ...d.occasionLabels].join(" "));
    return words.every((w) => hay.includes(w));
  });
  const price = (d: T, dir: 1 | -1) =>
    d.pricePkr === null ? Number.POSITIVE_INFINITY : dir * d.pricePkr;
  if (f.sort === "price-asc") out.sort((a, b) => price(a, 1) - price(b, 1));
  else if (f.sort === "price-desc")
    out.sort((a, b) => price(a, -1) - price(b, -1));
  else out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}
