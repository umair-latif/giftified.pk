import type { ProductId } from "@/config/products";
import { putAsset } from "@/features/editor/assets/asset-store";
import { saveDraft } from "@/features/editor/draft";
import { isDesignDocument, type DesignDocument } from "@/types/design";

interface TemplateResponse {
  meta: { id: string; productId: ProductId };
  design: unknown;
  assetUrls: Record<string, string>;
}

export class TemplateImportError extends Error {}

/**
 * Starts a fresh draft from a published template: downloads its sample photos
 * into the local asset store (so they behave like any photo the customer
 * added) and writes the template's design as the product's draft. Every
 * photo is a placeholder until the customer replaces it.
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

  const sizes = new Map<string, { w: number; h: number }>();
  for (const o of (data.design.fabric.objects ?? []) as Record<
    string,
    unknown
  >[]) {
    if (typeof o.assetId === "string")
      sizes.set(o.assetId, {
        w: Number(o.sourceWidthPx) || 1,
        h: Number(o.sourceHeightPx) || 1,
      });
  }
  await Promise.all(
    Object.entries(data.assetUrls).map(async ([assetId, url]) => {
      const photo = await (await fetch(url)).blob();
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
  if (!saveDraft(data.design)) throw new TemplateImportError("Couldn't start");
  return data.design;
}
