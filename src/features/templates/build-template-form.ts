import { mapImageSources } from "@/features/editor/assets/asset-ref";
import { getAsset } from "@/features/editor/assets/asset-store";
import type { OccasionSlug } from "@/server/templates/types";
import type { DesignDocument } from "@/types/design";

export interface TemplateFormMeta {
  /** Reserved by `uploadTemplatePhotos` when the design has artwork photos. */
  id?: string;
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
 * The multipart body for POST /api/admin/templates: meta + design + product
 * images + a small thumbnail. No photos: see `uploadTemplatePhotos`.
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

/** Photos of a design, sorted by where their files come from. */
export function designPhotos(design: DesignDocument): {
  /** Customer's photos without a sample from the library (can't publish). */
  missingSample: number;
  /** Artwork added on this phone: originals to upload. */
  toUpload: string[];
} {
  let missingSample = 0;
  const toUpload = new Set<string>();
  mapImageSources(design.fabric, (o) => {
    if (o.placeholder === true) {
      if (typeof o.sampleId !== "string" || !o.sampleId) missingSample++;
    } else if (typeof o.assetId === "string" && !o.templateAsset) {
      toUpload.add(o.assetId);
    }
    return typeof o.src === "string" ? o.src : null;
  });
  return { missingSample, toUpload: [...toUpload] };
}

export class PublishError extends Error {}

/**
 * Uploads the design's artwork photos (ORIGINAL + preview) straight from the
 * phone to storage and returns the reserved design id to publish under, or
 * undefined when there is nothing to upload. Customer's photos are copied
 * from the sample library on the server; artwork taken from another
 * published design is copied there too.
 */
export async function uploadTemplatePhotos(
  design: DesignDocument,
  onProgress?: (done: number, total: number) => void,
): Promise<string | undefined> {
  const { missingSample, toUpload } = designPhotos(design);
  if (missingSample)
    throw new PublishError(
      "Each customer's photo needs a sample photo. Tap the photo, then Customer's photo, and pick one.",
    );
  if (!toUpload.length) return undefined;
  const assets = await Promise.all(
    toUpload.map(async (id) => {
      const asset = await getAsset(id);
      if (!asset) throw new PublishError("A photo is no longer on this phone");
      return { id, asset };
    }),
  );
  const res = await fetch("/api/admin/templates/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      assets: assets.map(({ id, asset }) => ({
        assetId: id,
        contentType: asset.mime,
        size: asset.original.size,
      })),
    }),
  });
  const ticket = (await res.json().catch(() => ({}))) as {
    templateId?: string;
    uploads?: {
      assetId: string;
      original: { url: string; contentType: string };
      preview: { url: string; contentType: string };
    }[];
    error?: string;
  };
  if (!res.ok || !ticket.templateId || !ticket.uploads)
    throw new PublishError(ticket.error ?? "Couldn't upload the photos");
  let done = 0;
  onProgress?.(0, ticket.uploads.length);
  for (const u of ticket.uploads) {
    const asset = assets.find((a) => a.id === u.assetId)?.asset;
    if (!asset) throw new PublishError("Upload mismatch. Please try again.");
    await put(u.original.url, asset.original, u.original.contentType);
    await put(
      u.preview.url,
      await asWebp(asset.preview),
      u.preview.contentType,
    );
    onProgress?.(++done, ticket.uploads.length);
  }
  return ticket.templateId;
}

async function put(url: string, body: Blob, contentType: string) {
  const res = await fetch(url, {
    method: "PUT",
    body,
    headers: { "content-type": contentType },
  });
  if (!res.ok)
    throw new PublishError(
      `Couldn't upload a photo (HTTP ${res.status}). Please try again.`,
    );
}

/** The preview as WebP (it usually already is). */
async function asWebp(blob: Blob): Promise<Blob> {
  if (blob.type === "image/webp") return blob;
  const url = URL.createObjectURL(blob);
  try {
    return (await toWebp(url)) ?? blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
