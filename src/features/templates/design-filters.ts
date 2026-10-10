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
