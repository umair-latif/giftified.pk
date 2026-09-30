import type { ProductId } from "@/config/products";
import { mapImageSources } from "@/features/editor/assets/asset-ref";
import { putAsset } from "@/features/editor/assets/asset-store";
import {
  makePreview,
  previewSize,
} from "@/features/editor/assets/prepare-image";
import {
  clearDraft,
  saveDraft,
  setDraftSaved,
  setDraftTemplate,
} from "@/features/editor/draft";
import { isDesignDocument, type DesignDocument } from "@/types/design";

interface OpenResponse {
  meta?: {
    id: string;
    productId: ProductId;
    name: string;
    templateId?: string;
  };
  design?: unknown;
  assetUrls?: Record<string, string>;
  error?: string;
}

export class OpenDesignFailed extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * Continues a saved design on this device: downloads its ORIGINAL photos
 * into the local asset store (with a preview of exactly the size the design
 * was made with — crops are stored in preview pixels) and makes it the
 * product's draft, remembering which saved design it is.
 */
export async function openSavedDesign(
  savedId: string,
  productId: ProductId,
  doFetch: typeof fetch = (i, init) => fetch(i, init),
): Promise<DesignDocument> {
  const res = await doFetch(
    `/api/account/designs/${encodeURIComponent(savedId)}`,
  );
  const data = (await res.json().catch(() => ({}))) as OpenResponse;
  if (!res.ok || !data.meta || !data.assetUrls)
    throw new OpenDesignFailed(
      data.error ?? "We couldn't open that design.",
      res.status,
    );
  if (
    data.meta.productId !== productId ||
    !isDesignDocument(data.design, productId)
  )
    throw new OpenDesignFailed("That design is for another product.");
  const design = data.design;

  await downloadPhotos(design, data.assetUrls, doFetch);
  clearDraft(productId); // drops the old draft's template and saved-design links
  if (!saveDraft(design))
    throw new OpenDesignFailed(
      "Your phone's storage is full, so the design couldn't be opened.",
    );
  // A design product (task 26) stays priced as that product.
  if (data.meta.templateId) setDraftTemplate(productId, data.meta.templateId);
  setDraftSaved(productId, { id: data.meta.id, name: data.meta.name });
  return design;
}

/**
 * Puts a stored design's ORIGINAL photos into the local asset store, each
 * with a preview of exactly the size the design was made with (crops are
 * stored in preview pixels). Shared by "open saved design" and "Order again".
 */
export async function downloadPhotos(
  design: DesignDocument,
  assetUrls: Record<string, string>,
  doFetch: typeof fetch = (i, init) => fetch(i, init),
): Promise<void> {
  // Image objects by asset id, also inside groups (photo frames).
  const byAsset = new Map<string, Record<string, unknown>>();
  mapImageSources(design.fabric, (o) => {
    if (typeof o.assetId === "string" && !byAsset.has(o.assetId))
      byAsset.set(o.assetId, o);
    return typeof o.src === "string" ? o.src : null;
  });
  await Promise.all(
    Object.entries(assetUrls).map(async ([assetId, url]) => {
      const r = await doFetch(url);
      if (!r.ok) throw new OpenDesignFailed("A photo couldn't be downloaded.");
      const original = await r.blob();
      const o = byAsset.get(assetId) ?? {};
      const w = Number(o.sourceWidthPx) || 1;
      const h = Number(o.sourceHeightPx) || 1;
      const fit = previewSize(w, h);
      const pw = Number(o.previewWidthPx) || fit.width;
      const ph = Number(o.previewHeightPx) || fit.height;
      const preview =
        pw === w && ph === h ? original : await makePreview(original, pw, ph);
      await putAsset({
        id: assetId,
        name: "photo",
        mime: original.type || "image/jpeg",
        widthPx: w,
        heightPx: h,
        original,
        preview,
        createdAt: Date.now(),
      });
    }),
  );
}
