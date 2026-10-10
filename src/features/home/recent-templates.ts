import "server-only";
import { getProduct } from "@/config/products";
import type { ObjectStorage } from "@/lib/storage";
import { loadTemplates } from "@/features/templates/load-templates";
import { listTemplates } from "@/server/templates";
import {
  withLiveDesigns,
  type DesignPrice,
} from "@/features/templates/load-design-prices";
import { templateHref, tileImage } from "@/features/templates/tile-image";

export interface RecentTemplate {
  id: string;
  name: string;
  productName: string;
  /** Mockup (or flat thumbnail) served by /api/templates, or null (plain tile). */
  image: { src: string; kind: "mockup" | "art" } | null;
  /** WooCommerce price of a design product (absent for plain templates). */
  price?: DesignPrice;
  /** Design products open their page; plain templates open the editor. */
  href: string;
}

/**
 * The newest published templates, for the home page. Never throws: with no
 * templates, or storage unreachable (e.g. a CI build), the section is simply
 * left out.
 */
export async function loadRecentTemplates(
  limit = 6,
  storage?: ObjectStorage,
): Promise<RecentTemplate[]> {
  try {
    // The shop's cached list (tag "templates"): publishing a design expires
    // it, so the home page shows it at once instead of after its hourly
    // refresh. Tests pass their own storage.
    const listed = storage
      ? await listTemplates({}, storage)
      : await loadTemplates();
    // Design products only (older plain templates are not shown).
    const known = listed.filter((t) => t.product && getProduct(t.productId));
    // Drop design products deleted in WooCommerce BEFORE taking the newest N.
    const { templates: live, prices } = await withLiveDesigns(known);
    return live.slice(0, limit).map((t) => ({
      id: t.id,
      name: t.name,
      productName: getProduct(t.productId)?.name ?? "",
      image: tileImage(t),
      ...(prices[t.id] ? { price: prices[t.id] } : {}),
      href: templateHref(t),
    }));
  } catch (err) {
    console.warn(
      "[home] templates unavailable:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
