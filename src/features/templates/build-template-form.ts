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

/** A product image: a mockup of the design on the product (data URL). */
export interface ProductImage {
  label: string;
  dataUrl: string;
}

/** Image data URL → WebP blob, shrunk to `maxWidth` when wider (thumbnails and product images). */
async function toWebp(
  dataUrl: string,
  maxWidth = Infinity,
): Promise<Blob | null> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
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
  images: ProductImage[] = [],
  productId = design.productId,
): Promise<FormData> {
  const form = new FormData();
  form.set(
    "meta",
    JSON.stringify({
      ...meta,
      productId,
      ...(images.length ? { imageLabels: images.map((i) => i.label) } : {}),
    }),
  );
  form.set("design", JSON.stringify(design));
  for (const id of collectAssetIds(design.fabric)) {
    const asset = await getAsset(id);
    if (!asset) throw new Error("A photo is no longer on this phone");
    form.set(`asset:${id}`, asset.preview, id);
  }
  for (const [i, img] of images.entries()) {
    const blob = await toWebp(img.dataUrl, 1080);
    if (blob) form.set(`image:${i}`, blob, `image-${i}.webp`);
  }
  // The gallery thumbnail is the main product image, small.
  const thumbSource = images[0]?.dataUrl ?? thumbnailDataUrl;
  const thumb = thumbSource ? await toWebp(thumbSource, 480) : null;
  if (thumb) form.set("thumbnail", thumb, "thumbnail.webp");
  return form;
}
