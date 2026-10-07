import type { ProductId } from "@/config/products";
import { writeProductColour } from "@/features/editor/colour";
import { putAsset } from "@/features/editor/assets/asset-store";
import {
  saveDraft,
  setDraftSaved,
  setDraftTemplate,
} from "@/features/editor/draft";
import { isDesignDocument, type DesignDocument } from "@/types/design";

interface TemplateResponse {
  meta: { id: string; productId: ProductId; colourId?: string };
  design: unknown;
  assetUrls: Record<string, string>;
}

export class TemplateImportError extends Error {}

/**
 * Starts a fresh draft from a published template: downloads its sample photos
 * into the local asset store (so they behave like any photo the customer
 * added) and writes the template's design as the product's draft. Customers
 * may change anything; customer's photos must be replaced before ordering.
 */
export async function importTemplate(
  templateId: string,
  productId: ProductId,
): Promise<DesignDocument> {
  const res = await fetch(`/api/templates/${encodeURIComponent(templateId)}`);
  if (!res.ok) throw new TemplateImportError("Template not found");
  const data = (await res.json()) as TemplateResponse;
  if (
    data.meta.productId !== productId ||
    !isDesignDocument(data.design, productId)
  )
    throw new TemplateImportError("Template doesn't fit this product");

  await downloadTemplatePhotos(data.design, data.assetUrls);
  const design: DesignDocument = data.design;
  if (!saveDraft(design)) throw new TemplateImportError("Couldn't start");
  // Start on the garment colour the design was made for.
  if (data.meta.colourId) writeProductColour(productId, data.meta.colourId);
  setDraftTemplate(productId, templateId);
  setDraftSaved(productId, null); // a new design, not a saved one
  return design;
}

/**
 * Puts a published design's photos into this phone's asset store, so the
 * editor (and the cart) can show them: customer's photos get their sample,
 * artwork its ≤2048 px preview. Artwork keeps its `templateAsset` flag, so
 * checkout copies the ORIGINAL on the server instead of uploading this copy.
 */
export async function downloadTemplatePhotos(
  design: DesignDocument,
  assetUrls: Record<string, string>,
): Promise<void> {
  const sizes = new Map<string, { w: number; h: number }>();
  for (const o of (design.fabric.objects ?? []) as Record<string, unknown>[]) {
    if (typeof o.assetId === "string")
      sizes.set(o.assetId, {
        w: Number(o.sourceWidthPx) || 1,
        h: Number(o.sourceHeightPx) || 1,
      });
  }
  await Promise.all(
    Object.entries(assetUrls).map(async ([assetId, url]) => {
      const photo = await (await fetch(url, { cache: "no-store" })).blob();
      const size = sizes.get(assetId) ?? { w: 1, h: 1 };
      await putAsset({
        id: assetId,
        name: "sample",
        mime: photo.type,
        widthPx: size.w,
        heightPx: size.h,
        original: photo,
        preview: photo,
        createdAt: Date.now(),
      });
    }),
  );
}
