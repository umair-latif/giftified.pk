import type { MetadataRoute } from "next";
import { editableProductIds } from "@/config/products";
import { slugFor } from "@/features/catalog/catalog-model";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { appBaseUrl } from "@/server/files/links";
import { OCCASION_SLUGS } from "@/server/templates/types";

export const revalidate = 3600;

/** Public, indexable pages. Order pages are private (token links) and never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appBaseUrl();
  const catalog = await loadCatalog();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, changeFrequency: "weekly", priority: 0.9 },
    ...editableProductIds().map((id) => ({
      url: `${base}/products/${slugFor(id, catalog)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...OCCASION_SLUGS.map((slug) => ({
      url: `${base}/occasions/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
