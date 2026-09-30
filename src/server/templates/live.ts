import "server-only";
import type { CommerceClient } from "@/lib/commerce";
import type { TemplateMeta } from "./types";

/**
 * Design products are sold through WooCommerce, which is the source of truth
 * for whether one still exists: a founder may delete, trash or un-publish it in
 * WP admin at any time. This keeps only the templates that are still for sale
 * (templates that were never products are untouched). If WooCommerce can't be
 * reached, nothing is hidden — a brief outage must not empty the gallery.
 */
export async function filterLiveTemplates(
  templates: TemplateMeta[],
  /** The store, or a function that gets it (it may throw in a build without WooCommerce configured). */
  commerce: CommerceClient | (() => CommerceClient),
): Promise<TemplateMeta[]> {
  const ids = templates.filter((t) => t.product).map((t) => t.id);
  if (ids.length === 0) return templates;
  try {
    const store = typeof commerce === "function" ? commerce() : commerce;
    const live = new Set(
      (await store.listDesignProducts(ids)).map((p) => p.templateId),
    );
    return templates.filter((t) => !t.product || live.has(t.id));
  } catch (err) {
    console.warn(
      "[templates] couldn't check the shop products:",
      err instanceof Error ? err.message : err,
    );
    return templates;
  }
}
