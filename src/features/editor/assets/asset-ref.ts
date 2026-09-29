/**
 * Uploaded images are referenced from the design as `asset:<id>` instead of
 * URLs or data URLs, so designs stay tiny and the print renderer can swap in
 * the ORIGINAL file from storage. Pure helpers, unit-tested.
 */
export const ASSET_SCHEME = "asset:";

/** Custom Fabric props that must survive serialisation (history, drafts, orders). */
export const IMAGE_CUSTOM_PROPS = [
  "assetId",
  "sourceWidthPx",
  "sourceHeightPx",
  "previewWidthPx",
  "previewHeightPx",
  "frameShape",
  /** Template sample photo the customer must replace (task 18). */
  "placeholder",
  // Template layer roles (task 26): also on FabricObject in engine/layer-lock.ts.
  "customizable",
  "templateLocked",
] as const;

export function toAssetRef(id: string): string {
  return `${ASSET_SCHEME}${id}`;
}

export function parseAssetRef(src: unknown): string | null {
  return typeof src === "string" && src.startsWith(ASSET_SCHEME)
    ? src.slice(ASSET_SCHEME.length) || null
    : null;
}

interface SerializedObject {
  type?: unknown;
  src?: unknown;
  assetId?: unknown;
  objects?: unknown;
  [key: string]: unknown;
}

const isImage = (o: SerializedObject) =>
  typeof o.type === "string" && o.type.toLowerCase() === "image";

/** Returns a copy of Fabric JSON with every image `src` passed through `fn`. */
export function mapImageSources(
  fabric: Record<string, unknown>,
  fn: (obj: SerializedObject) => string | null,
): Record<string, unknown> {
  const walk = (objects: unknown): unknown =>
    Array.isArray(objects)
      ? objects.flatMap((raw: SerializedObject) => {
          const o: SerializedObject = { ...raw };
          if (Array.isArray(o.objects)) o.objects = walk(o.objects);
          if (!isImage(o)) return [o];
          const src = fn(o);
          return src === null ? [] : [{ ...o, src }]; // null = drop the image
        })
      : objects;
  return { ...fabric, objects: walk(fabric.objects) };
}

/** Rewrites runtime image URLs (blob:) to stable `asset:<id>` refs. */
export function toPortableFabric(
  fabric: Record<string, unknown>,
): Record<string, unknown> {
  return mapImageSources(fabric, (o) =>
    typeof o.assetId === "string"
      ? toAssetRef(o.assetId)
      : typeof o.src === "string"
        ? o.src
        : null,
  );
}

/** All asset IDs referenced by a design. */
export function collectAssetIds(fabric: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  mapImageSources(fabric, (o) => {
    const id = typeof o.assetId === "string" ? o.assetId : parseAssetRef(o.src);
    if (id) ids.add(id);
    return typeof o.src === "string" ? o.src : null;
  });
  return [...ids];
}
