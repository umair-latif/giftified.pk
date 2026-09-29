import { collectAssetIds } from "@/features/editor/assets/asset-ref";
import { getAsset } from "@/features/editor/assets/asset-store";
import type { OccasionSlug } from "@/server/templates/types";
import type { DesignDocument } from "@/types/design";

export interface TemplateFormMeta {
  name: string;
  occasions: OccasionSlug[];
  published: boolean;
  /** Publishing as a product (task 26). */
  product?: { description: string; pricePkr: number };
}

/** PNG data URL → WebP blob (the gallery thumbnail). */
async function toWebp(dataUrl: string): Promise<Blob | null> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")?.drawImage(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
}

/**
 * The multipart body for POST /api/admin/templates: meta + design + one sample
 * photo per photo in the design (the ≤2048 px preview, never the original)
 * + a small thumbnail of the design.
 */
export async function buildTemplateForm(
  design: DesignDocument,
  meta: TemplateFormMeta,
  thumbnailDataUrl: string | null,
  productId = design.productId,
): Promise<FormData> {
  const form = new FormData();
  form.set("meta", JSON.stringify({ ...meta, productId }));
  form.set("design", JSON.stringify(design));
  for (const id of collectAssetIds(design.fabric)) {
    const asset = await getAsset(id);
    if (!asset) throw new Error("A photo is no longer on this phone");
    form.set(`asset:${id}`, asset.preview, id);
  }
  const thumb = thumbnailDataUrl ? await toWebp(thumbnailDataUrl) : null;
  if (thumb) form.set("thumbnail", thumb, "thumbnail.webp");
  return form;
}
