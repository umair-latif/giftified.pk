import { mapImageSources, parseAssetRef } from "./asset-ref";
import { previewUrl } from "./asset-store";

/**
 * Replaces `asset:<id>` image refs with local preview URLs so Fabric can load
 * them. Images whose asset is gone (cleared browser data) are dropped and
 * reported, so the editor can tell the customer instead of failing.
 */
export async function resolveAssetRefs(
  fabric: Record<string, unknown>,
): Promise<{ fabric: Record<string, unknown>; missing: string[] }> {
  const urls = new Map<string, string | null>();
  const refs: string[] = [];
  mapImageSources(fabric, (o) => {
    const id = parseAssetRef(o.src);
    if (id) refs.push(id);
    return typeof o.src === "string" ? o.src : null;
  });
  await Promise.all(refs.map(async (id) => urls.set(id, await previewUrl(id))));
  const missing: string[] = [];
  const resolved = mapImageSources(fabric, (o) => {
    const id = parseAssetRef(o.src);
    if (!id) return typeof o.src === "string" ? o.src : null;
    const url = urls.get(id) ?? null;
    if (!url) missing.push(id);
    return url;
  });
  return { fabric: resolved, missing };
}
