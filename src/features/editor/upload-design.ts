import type { ProductId } from "@/config/products";
import type { DesignDocument } from "@/types/design";
import { collectAssetIds } from "./assets/asset-ref";
import { getAsset, type StoredAsset } from "./assets/asset-store";
import { loadDraft } from "./draft";

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

export async function uploadDesignForOrder(
  productId: ProductId,
  deps: Partial<UploadDeps> = {},
): Promise<{ designId: string }> {
  const d: UploadDeps = {
    fetch: deps.fetch ?? fetch,
    loadDraft: deps.loadDraft ?? loadDraft,
    getAsset: deps.getAsset ?? getAsset,
    onProgress: deps.onProgress,
  };

  const design = d.loadDraft(productId);
  if (!design) throw new DesignUploadFailed("There's no design to order yet.");

  const ids = collectAssetIds(design.fabric);
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
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    designId?: string;
    uploads?: { assetId: string; url: string; contentType: string }[];
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
