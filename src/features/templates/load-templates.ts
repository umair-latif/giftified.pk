import "server-only";
import { unstable_cache } from "next/cache";
import { getCommerce } from "@/lib/commerce";
import { filterLiveTemplates } from "@/server/templates/live";
import { listTemplates } from "@/server/templates/store";
import type {
  ListTemplatesFilter,
  TemplateMeta,
} from "@/server/templates/types";

export const TEMPLATES_CACHE_TAG = "templates";

/**
 * Cached under the "templates" tag (5 minutes; saving a template expires it
 * at once). A storage hiccup — or a build without storage — is caught INSIDE
 * the cached function so the page still records its dependency on the tag and
 * "no templates yet" gets refreshed when one is saved.
 */
const cachedList = unstable_cache(
  async (productId?: string, occasion?: string): Promise<TemplateMeta[]> => {
    try {
      return await listTemplates({
        productId: productId as ListTemplatesFilter["productId"],
        occasion: occasion as ListTemplatesFilter["occasion"],
      });
    } catch (err) {
      console.warn(
        "[templates] couldn't list templates:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  },
  ["templates-list"],
  { tags: [TEMPLATES_CACHE_TAG], revalidate: 300 },
);

/**
 * Published templates for the shop pages, without the design products that were
 * removed or un-published in WooCommerce. Never throws.
 */
export async function loadTemplates(
  filter: Omit<ListTemplatesFilter, "includeUnpublished"> = {},
): Promise<TemplateMeta[]> {
  const listed = await cachedList(filter.productId, filter.occasion);
  return filterLiveTemplates(listed, getCommerce);
}
