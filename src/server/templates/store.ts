import "server-only";
import { z } from "zod";
import { getProduct } from "@/config/products";
import {
  collectAssetIds,
  mapImageSources,
  parseAssetRef,
  templateAssetOf,
} from "@/features/editor/assets/asset-ref";
import { printQualityReport } from "@/lib/print-quality";
import { newId } from "@/lib/id";
import {
  assertSafeId,
  getStorage,
  sampleKey,
  templateAssetKey,
  templatePreviewKey,
  templateDesignKey,
  templateIndexKey,
  templateImageKey,
  templateThumbKey,
  type ObjectStorage,
} from "@/lib/storage";
import { isDesignDocument, type DesignDocument } from "@/types/design";
import { getSample } from "./samples";
import {
  OCCASION_SLUGS,
  type ListTemplatesFilter,
  type SaveTemplateInput,
  type TemplateDetail,
  type TemplateMeta,
} from "./types";

/**
 * Templates live in object storage: `templates/index.json` (the list) plus a
 * folder per template. One founder writes them, so the index is a plain
 * read-modify-write. Server-only; customers reach it through
 * `/api/templates/<id>` and (task 19) server components.
 */
const metaSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  productId: z.string(),
  colourId: z.string().optional(),
  groupId: z.string().optional(),
  occasions: z.array(z.enum(OCCASION_SLUGS)),
  published: z.boolean(),
  hasThumbnail: z.boolean(),
  images: z.array(z.object({ label: z.string() })).optional(),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  product: z
    .object({
      slug: z.string(),
      wooProductId: z.number(),
      pricePkr: z.number(),
      description: z.string(),
    })
    .optional(),
});
const indexSchema = z.array(metaSchema);

export class TemplateError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 422 = 422,
  ) {
    super(message);
  }
}

async function readIndex(storage: ObjectStorage): Promise<TemplateMeta[]> {
  const raw = await storage.get(templateIndexKey());
  if (!raw) return [];
  const parsed = indexSchema.safeParse(
    JSON.parse(new TextDecoder().decode(raw)),
  );
  return parsed.success ? (parsed.data as TemplateMeta[]) : [];
}

export async function listTemplates(
  filter: ListTemplatesFilter = {},
  storage: ObjectStorage = getStorage(),
): Promise<TemplateMeta[]> {
  return (await readIndex(storage))
    .filter((t) => filter.includeUnpublished || t.published)
    .filter((t) => !filter.productId || t.productId === filter.productId)
    .filter((t) => !filter.occasion || t.occasions.includes(filter.occasion))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTemplate(
  id: string,
  opts: { includeUnpublished?: boolean } = {},
  storage: ObjectStorage = getStorage(),
): Promise<TemplateDetail | null> {
  const meta = (await readIndex(storage)).find((t) => t.id === id);
  if (!meta || (!meta.published && !opts.includeUnpublished)) return null;
  const raw = await storage.get(templateDesignKey(id));
  if (!raw) return null;
  const design: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!isDesignDocument(design)) return null;
  return {
    meta,
    design,
    assetIds: collectAssetIds(design.fabric),
    placeholderIds: placeholderAssetIds(design.fabric),
  };
}

/** Asset ids of the design's customer's photos (samples). */
export function placeholderAssetIds(fabric: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  mapImageSources(fabric, (o) => {
    if (o.placeholder === true && typeof o.assetId === "string")
      ids.add(o.assetId);
    return typeof o.src === "string" ? o.src : null;
  });
  return [...ids];
}

/** Layer flags from before task 26 slice 4 (locks); nothing is locked any more. */
const LEGACY_PROPS = ["customizable", "templateLocked"] as const;

/**
 * The design as stored for template `id`: customer's photos keep their
 * `sampleId`, every other photo becomes artwork of this design
 * (`templateAsset: id`), and old lock flags are dropped. Throws when a
 * customer's photo has no sample.
 */
export function prepareTemplateFabric(
  fabric: Record<string, unknown>,
  id: string,
): Record<string, unknown> {
  const strip = (objects: unknown): unknown =>
    Array.isArray(objects)
      ? objects.map((raw: Record<string, unknown>) => {
          const o = { ...raw };
          for (const k of LEGACY_PROPS) delete o[k];
          if (Array.isArray(o.objects)) o.objects = strip(o.objects);
          return o;
        })
      : objects;
  const cleaned = { ...fabric, objects: strip(fabric.objects) };
  return mapImageSources(cleaned, (o) => {
    if (o.placeholder === true) {
      if (typeof o.sampleId !== "string" || !o.sampleId)
        throw new TemplateError(
          "Each customer's photo needs a sample photo. Tap the photo, then Customer's photo, and pick one.",
        );
      delete o.templateAsset;
    } else {
      delete o.placeholder;
      delete o.sampleId;
      o.templateAsset = id;
    }
    return typeof o.src === "string" ? o.src : null;
  });
}

/** Where an artwork photo's files come from when saving template `id`. */
type ArtworkSource =
  { kind: "uploaded" } | { kind: "template"; templateId: string };

/**
 * True when `assetId` is an ARTWORK photo of template `templateId` (not a
 * sample), so its original may be copied into another design or an order.
 */
export async function isTemplateArtwork(
  templateId: string,
  assetId: string,
  opts: { includeUnpublished?: boolean },
  storage: ObjectStorage = getStorage(),
): Promise<boolean> {
  const t = await getTemplate(templateId, opts, storage);
  return (
    !!t && t.assetIds.includes(assetId) && !t.placeholderIds.includes(assetId)
  );
}

async function copyObject(
  storage: ObjectStorage,
  from: string,
  to: string,
  contentType?: string,
): Promise<boolean> {
  if (from === to) return (await storage.head(from)) !== null;
  const [bytes, info] = await Promise.all([
    storage.get(from),
    storage.head(from),
  ]);
  if (!bytes) return false;
  await storage.put(to, bytes, {
    contentType: contentType ?? info?.contentType ?? "application/octet-stream",
  });
  return true;
}

interface CheckedTemplate {
  id: string;
  name: string;
  index: TemplateMeta[];
  printArea: DesignDocument["printArea"];
  fabric: Record<string, unknown>;
  placeholders: Map<string, string>;
  artwork: Map<string, ArtworkSource>;
}

/**
 * Every check `saveTemplate` makes, without writing anything: publishing
 * runs it before creating the shop product, so a bad design never leaves a
 * stray WooCommerce draft behind.
 */
export async function checkTemplate(
  input: SaveTemplateInput,
  id: string,
  storage: ObjectStorage = getStorage(),
): Promise<CheckedTemplate> {
  const name = input.name.trim();
  if (!name) throw new TemplateError("A template needs a name", 400);
  if (!isDesignDocument(input.design, input.productId))
    throw new TemplateError("Invalid design", 400);
  const product = getProduct(input.productId);
  if (!product) throw new TemplateError(`Unknown product ${input.productId}`);

  const index = await readIndex(storage);
  assertSafeId(id, "templateId");
  if (index.some((t) => t.id === id))
    throw new TemplateError("This design was already saved", 400);

  // Where each photo's files come from.
  const source = input.design.fabric;
  const placeholders = new Map<string, string>(); // assetId → sampleId
  const artwork = new Map<string, ArtworkSource>();
  mapImageSources(source, (o) => {
    const assetId =
      typeof o.assetId === "string" ? o.assetId : parseAssetRef(o.src);
    if (!assetId) throw new TemplateError("A photo has no file", 400);
    if (o.placeholder === true) {
      if (typeof o.sampleId === "string" && o.sampleId)
        placeholders.set(assetId, o.sampleId);
    } else {
      const from = templateAssetOf(o);
      artwork.set(
        assetId,
        from && from !== id
          ? { kind: "template", templateId: from }
          : { kind: "uploaded" },
      );
    }
    return typeof o.src === "string" ? o.src : null;
  });
  const fabric = prepareTemplateFabric(source, id); // throws without samples

  if (printQualityReport(fabric).status === "block")
    throw new TemplateError(
      "A photo is too blurry to print at its size. Make it smaller or use a sharper one.",
    );

  for (const sampleId of new Set(placeholders.values()))
    if (!(await getSample(sampleId, storage)))
      throw new TemplateError(
        "A sample photo is no longer in the library. Pick another one.",
      );
  for (const [assetId, from] of artwork) {
    if (from.kind === "uploaded") {
      const [original, preview] = await Promise.all([
        storage.head(templateAssetKey(id, assetId)),
        storage.head(templatePreviewKey(id, assetId)),
      ]);
      if (!original || !preview)
        throw new TemplateError(
          "A photo didn't finish uploading. Please try again.",
        );
    } else if (
      !(await isTemplateArtwork(
        from.templateId,
        assetId,
        { includeUnpublished: true },
        storage,
      ))
    ) {
      throw new TemplateError(
        "A photo from another design is no longer available. Replace it and try again.",
      );
    }
  }
  return {
    id,
    name,
    index,
    printArea: { ...product.printArea },
    fabric,
    placeholders,
    artwork,
  };
}

export async function saveTemplate(
  input: SaveTemplateInput,
  storage: ObjectStorage = getStorage(),
  makeId: () => string = newId,
  now: () => Date = () => new Date(),
): Promise<TemplateMeta> {
  const { id, name, index, printArea, fabric, placeholders, artwork } =
    await checkTemplate(input, input.id ?? makeId(), storage);

  // Copy samples and artwork from other designs into this one.
  await Promise.all([
    ...[...placeholders].map(async ([assetId, sampleId]) => {
      if (
        !(await copyObject(
          storage,
          sampleKey(sampleId),
          templateAssetKey(id, assetId),
        ))
      )
        throw new TemplateError("A sample photo is missing. Pick another one.");
    }),
    ...[...artwork].flatMap(([assetId, from]) =>
      from.kind === "template"
        ? [
            copyObject(
              storage,
              templateAssetKey(from.templateId, assetId),
              templateAssetKey(id, assetId),
            ),
            copyObject(
              storage,
              templatePreviewKey(from.templateId, assetId),
              templatePreviewKey(id, assetId),
            ),
          ]
        : [],
    ),
  ]);

  const design: DesignDocument = { ...input.design, printArea, fabric };
  await Promise.all([
    storage.put(templateDesignKey(id), JSON.stringify(design), {
      contentType: "application/json",
    }),
    ...(input.images ?? []).map((img, i) =>
      storage.put(templateImageKey(id, i), img.bytes, {
        contentType: "image/webp",
      }),
    ),
    input.thumbnail
      ? storage.put(templateThumbKey(id), input.thumbnail, {
          contentType: "image/webp",
        })
      : Promise.resolve(),
  ]);
  const meta: TemplateMeta = {
    id,
    name,
    productId: input.productId,
    ...(input.colourId ? { colourId: input.colourId } : {}),
    ...(input.groupId ? { groupId: input.groupId } : {}),
    occasions: [...new Set(input.occasions)],
    published: input.published,
    hasThumbnail: !!input.thumbnail,
    ...(input.images?.length
      ? { images: input.images.map((i) => ({ label: i.label })) }
      : {}),
    createdAt: now().toISOString(),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    ...(input.product ? { product: input.product } : {}),
  };
  await storage.put(templateIndexKey(), JSON.stringify([...index, meta]), {
    contentType: "application/json",
  });
  return meta;
}

/** Image types a designer may upload as artwork (same as customers' photos). */
export interface TemplateUploadRequest {
  assets: { assetId: string; contentType: string; size: number }[];
}

export interface TemplateUploadTicket {
  /** Pass back as the template id when saving. */
  templateId: string;
  uploads: {
    assetId: string;
    /** PUT the ORIGINAL here. */
    original: { url: string; contentType: string };
    /** PUT the ≤2048 px WebP preview here. */
    preview: { url: string; contentType: "image/webp" };
  }[];
}

/**
 * Step 1 of publishing a design with artwork photos: reserve its id and hand
 * back direct-upload URLs for each photo's original and preview (the
 * originals can be far over our 4.5 MB request limit).
 */
export async function createTemplateUploads(
  req: TemplateUploadRequest,
  storage: ObjectStorage = getStorage(),
  makeId: () => string = newId,
): Promise<TemplateUploadTicket> {
  const templateId = makeId();
  const uploads = await Promise.all(
    req.assets.map(async (a) => ({
      assetId: assertSafeId(a.assetId, "assetId"),
      original: {
        contentType: a.contentType,
        url: await storage.presignPut(templateAssetKey(templateId, a.assetId), {
          contentType: a.contentType,
          expiresInS: 30 * 60,
        }),
      },
      preview: {
        contentType: "image/webp" as const,
        url: await storage.presignPut(
          templatePreviewKey(templateId, a.assetId),
          { contentType: "image/webp", expiresInS: 30 * 60 },
        ),
      },
    })),
  );
  return { templateId, uploads };
}

/**
 * Short-lived download URLs for the photos the editor shows (bucket stays
 * private): a customer's photo's sample, or an artwork photo's PREVIEW (never
 * its original, which can be many MB on a phone's data plan).
 */
export async function templateAssetUrls(
  detail: TemplateDetail,
  storage: ObjectStorage = getStorage(),
): Promise<Record<string, string>> {
  const samples = new Set(detail.placeholderIds);
  const entries = await Promise.all(
    detail.assetIds.map(async (a) => {
      const id = detail.meta.id;
      // Older designs stored only the sample/preview under assets/.
      const key =
        !samples.has(a) && (await storage.head(templatePreviewKey(id, a)))
          ? templatePreviewKey(id, a)
          : templateAssetKey(id, a);
      return [
        a,
        await storage.presignGet(key, { expiresInS: 10 * 60 }),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
