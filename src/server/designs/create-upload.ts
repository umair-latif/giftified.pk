import { z } from "zod";
import { getProduct } from "@/config/products";
import {
  collectAssetIds,
  collectTemplateAssets,
  mapImageSources,
} from "@/features/editor/assets/asset-ref";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/features/editor/assets/prepare-image";
import { newId } from "@/lib/id";
import { printQualityReport } from "@/lib/print-quality";
import {
  assetKey,
  designKey,
  designThumbKey,
  templateAssetKey,
  type ObjectStorage,
} from "@/lib/storage";
import { isDesignDocument, type DesignDocument } from "@/types/design";

/**
 * Step 1 of checkout: store the design and hand back direct-upload URLs for
 * the ORIGINAL photos. The design JSON is small (photos are `asset:<id>` refs),
 * so it goes through us; photos go straight from the phone to storage.
 */
export const createDesignUploadSchema = z.object({
  design: z.unknown(),
  assets: z
    .array(
      z.object({
        assetId: z.string().min(1).max(64),
        contentType: z.enum(ACCEPTED_IMAGE_TYPES),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .max(20),
  /** The client also uploads a small thumbnail (shown in My designs, task 22). */
  thumbnail: z.boolean().optional(),
});

export type CreateDesignUploadInput = z.infer<typeof createDesignUploadSchema>;

export interface DesignUploadTicket {
  designId: string;
  uploads: { assetId: string; url: string; contentType: string }[];
  /** PUT a WebP thumbnail here (only when asked for). */
  thumbnailUrl?: string;
}

export class DesignUploadError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 422,
  ) {
    super(message);
  }
}

/** True when `assetId` is artwork of published design `templateId` (injected: server-only module). */
export type TemplateArtworkCheck = (
  templateId: string,
  assetId: string,
) => Promise<boolean>;

export async function createDesignUpload(
  body: unknown,
  storage: ObjectStorage,
  makeId: () => string = newId,
  isTemplateArtwork: TemplateArtworkCheck = async () => false,
): Promise<DesignUploadTicket> {
  const parsed = createDesignUploadSchema.safeParse(body);
  if (!parsed.success)
    throw new DesignUploadError("Invalid upload request", 400);
  const { design, assets } = parsed.data;

  if (!isDesignDocument(design))
    throw new DesignUploadError("Invalid design", 400);
  const product = getProduct(design.productId);
  if (!product)
    throw new DesignUploadError(`Unknown product ${design.productId}`, 422);

  // Artwork of a published design is copied from its storage; every other
  // referenced photo must be uploaded, and nothing else.
  const fromTemplate = collectTemplateAssets(design.fabric);
  const referenced = new Set(
    collectAssetIds(design.fabric).filter((id) => !fromTemplate.has(id)),
  );
  const offered = new Set(assets.map((a) => a.assetId));
  const missing = [...referenced].filter((id) => !offered.has(id));
  const extra = [...offered].filter((id) => !referenced.has(id));
  if (missing.length || extra.length) {
    throw new DesignUploadError(
      "Photos in the design don't match the uploaded photos",
      422,
    );
  }

  if (printQualityReport(design.fabric).placeholders > 0) {
    throw new DesignUploadError(
      "This design still has a sample photo. Tap it and choose Replace to add your own.",
      422,
    );
  }
  if (printQualityReport(design.fabric).status === "block") {
    throw new DesignUploadError(
      "A photo is too blurry to print at its size. Go back and make it smaller.",
      422,
    );
  }

  // The server's product config is the source of truth for the print size.
  // Artwork originals are copied in below, so the order's design stands on its
  // own (reorder works even if the published design is deleted later).
  const stored: DesignDocument = {
    ...design,
    printArea: { ...product.printArea },
    fabric: mapImageSources(design.fabric, (o) => {
      delete o.templateAsset;
      return typeof o.src === "string" ? o.src : null;
    }),
  };
  for (const [assetId, templateId] of fromTemplate)
    if (!(await isTemplateArtwork(templateId, assetId)))
      throw new DesignUploadError(
        "This design isn't available any more. Please remove it from your cart.",
        422,
      );

  const designId = makeId();
  // The design's artwork prints from the ORIGINAL kept with the published design.
  await Promise.all(
    [...fromTemplate].map(async ([assetId, templateId]) => {
      const from = templateAssetKey(templateId, assetId);
      const [bytes, info] = await Promise.all([
        storage.get(from),
        storage.head(from),
      ]);
      if (!bytes)
        throw new DesignUploadError(
          "This design isn't available any more. Please remove it from your cart.",
          422,
        );
      await storage.put(assetKey(designId, assetId), bytes, {
        contentType: info?.contentType ?? "application/octet-stream",
      });
    }),
  );
  await storage.put(designKey(designId), JSON.stringify(stored), {
    contentType: "application/json",
  });

  const uploads = await Promise.all(
    assets.map(async (a) => ({
      assetId: a.assetId,
      contentType: a.contentType,
      url: await storage.presignPut(assetKey(designId, a.assetId), {
        contentType: a.contentType,
        expiresInS: 30 * 60,
      }),
    })),
  );
  return {
    designId,
    uploads,
    ...(parsed.data.thumbnail
      ? {
          thumbnailUrl: await storage.presignPut(designThumbKey(designId), {
            contentType: "image/webp",
            expiresInS: 30 * 60,
          }),
        }
      : {}),
  };
}
