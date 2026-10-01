import type { ProductId } from "@/config/products";
import type { DesignDocument } from "@/types/design";
import { collectAssetIds, collectTemplateAssets } from "./assets/asset-ref";
import { getAsset, type StoredAsset } from "./assets/asset-store";
import { loadDraft, loadThumbnail } from "./draft";

/**
 * Uploads the saved design and its ORIGINAL photos for an order, straight
 * from the phone to storage. Call it at checkout, before creating the order;
 * put the returned `designId` on the order line.
 */
export interface UploadDeps {
  fetch: typeof fetch;
  loadDraft: (productId: ProductId) => DesignDocument | null;
  getAsset: (
    id: string,
  ) => Promise<Pick<StoredAsset, "original" | "mime"> | null>;
  /** Called after each photo finishes: (done, total). */
  onProgress?: (done: number, total: number) => void;
}

export class DesignUploadFailed extends Error {}

export type UploadOptions = Partial<Omit<UploadDeps, "loadDraft">> & {
  /** Small WebP of the design, stored beside it (My designs thumbnail). */
  thumbnail?: Blob | null;
};

export async function uploadDesignForOrder(
  productId: ProductId,
  deps: Partial<UploadDeps> = {},
): Promise<{ designId: string }> {
  const design = (deps.loadDraft ?? loadDraft)(productId);
  if (!design) throw new DesignUploadFailed("There's no design to order yet.");
  return uploadDesign(design, deps);
}

/** Uploads a saved cart design (see `src/features/cart`). */
export async function uploadCartDesign(
  productId: ProductId,
  designKey: string,
  deps: UploadOptions = {},
): Promise<{ designId: string }> {
  const design = loadDraft(productId, designKey);
  if (!design)
    throw new DesignUploadFailed(
      "A design in your cart is no longer on this phone. Please remove it and design it again.",
    );
  return uploadDesign(design, {
    thumbnail: dataUrlToBlob(loadThumbnail(designKey)),
    ...deps,
  });
}

/** A `data:image/…;base64,` URL as a Blob, or null. */
export function dataUrlToBlob(dataUrl: string | null): Blob | null {
  const m = dataUrl
    ? /^data:(image\/[a-z+]+);base64,(.*)$/.exec(dataUrl)
    : null;
  if (!m) return null;
  try {
    const bin = atob(m[2]!);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  } catch {
    return null;
  }
}

/** Uploads one design + its ORIGINAL photos; returns the server's designId. */
export async function uploadDesign(
  design: DesignDocument,
  deps: UploadOptions = {},
): Promise<{ designId: string }> {
  const d = {
    // Wrapped: calling the browser's fetch as a method of `d` throws "Illegal invocation".
    fetch:
      deps.fetch ??
      ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)),
    getAsset: deps.getAsset ?? getAsset,
    onProgress: deps.onProgress,
  };

  // Artwork of a published design is copied on the server from that design's
  // storage; only the customer's own photos go up from the phone.
  const fromTemplate = collectTemplateAssets(design.fabric);
  const ids = collectAssetIds(design.fabric).filter(
    (id) => !fromTemplate.has(id),
  );
  const assets = await Promise.all(
    ids.map(async (id) => ({ id, asset: await d.getAsset(id) })),
  );
  const lost = assets.find((a) => !a.asset);
  if (lost) {
    throw new DesignUploadFailed(
      "A photo in your design is no longer on this phone. Please add it again.",
    );
  }

  const res = await d.fetch("/api/designs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      design,
      assets: assets.map(({ id, asset }) => ({
        assetId: id,
        contentType: asset!.mime,
        size: asset!.original.size,
      })),
      ...(deps.thumbnail ? { thumbnail: true } : {}),
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    designId?: string;
    uploads?: { assetId: string; url: string; contentType: string }[];
    thumbnailUrl?: string;
    error?: string;
  };
  if (!res.ok || !json.designId || !json.uploads) {
    throw new DesignUploadFailed(
      json.error ?? "Couldn't save your design. Please try again.",
    );
  }

  let done = 0;
  d.onProgress?.(0, json.uploads.length);
  for (const u of json.uploads) {
    const asset = assets.find((a) => a.id === u.assetId)?.asset;
    if (!asset)
      throw new DesignUploadFailed("Upload mismatch. Please try again.");
    await putWithRetry(d.fetch, u.url, asset.original, u.contentType);
    d.onProgress?.(++done, json.uploads.length);
  }
  if (json.thumbnailUrl && deps.thumbnail)
    // Best effort: a missing thumbnail only means a plain tile in My designs.
    await putWithRetry(
      d.fetch,
      json.thumbnailUrl,
      deps.thumbnail,
      "image/webp",
    ).catch(() => undefined);
  return { designId: json.designId };
}

async function putWithRetry(
  doFetch: typeof fetch,
  url: string,
  body: Blob,
  contentType: string,
) {
  let lastError = "network error";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await doFetch(url, {
        method: "PUT",
        body,
        headers: { "content-type": contentType },
      });
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
      if (res.status < 500) break; // 4xx won't fix itself: expired link, bad request
    } catch (err) {
      lastError = err instanceof Error ? err.message : "network error";
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  throw new DesignUploadFailed(
    `Couldn't upload your photo (${lastError}). Check your connection and try again.`,
  );
}
