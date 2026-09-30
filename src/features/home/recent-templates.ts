import "server-only";
import { getProduct } from "@/config/products";
import {
  getStorage,
  templateThumbKey,
  type ObjectStorage,
} from "@/lib/storage";
import { getCommerce } from "@/lib/commerce";
import { filterLiveTemplates, listTemplates } from "@/server/templates";

export interface RecentTemplate {
  id: string;
  name: string;
  productName: string;
  /** Short-lived link to the thumbnail, or null (the card shows a plain tile). */
  thumbnailUrl: string | null;
  /** The editor loads the template into a fresh draft. */
  href: string;
}

/** Long enough that a cached (ISR) home page never shows an expired link. */
const THUMB_URL_TTL_S = 6 * 3600;

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
    const store = storage ?? getStorage();
    const metas = (
      await filterLiveTemplates(await listTemplates({}, store), getCommerce)
    )
      .filter((t) => getProduct(t.productId))
      .slice(0, limit);
    return await Promise.all(
      metas.map(async (t) => ({
        id: t.id,
        name: t.name,
        productName: getProduct(t.productId)?.name ?? "",
        thumbnailUrl: t.hasThumbnail
          ? await store.presignGet(templateThumbKey(t.id), {
              expiresInS: THUMB_URL_TTL_S,
            })
          : null,
        href: `/design/${t.productId}?template=${encodeURIComponent(t.id)}`,
      })),
    );
  } catch (err) {
    console.warn(
      "[home] templates unavailable:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
