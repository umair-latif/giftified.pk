import "server-only";
import { z } from "zod";
import { getProduct } from "@/config/products";
import {
  collectAssetIds,
  mapImageSources,
} from "@/features/editor/assets/asset-ref";
import { newId } from "@/lib/id";
import {
  getStorage,
  templateAssetKey,
  templateDesignKey,
  templateIndexKey,
  templateThumbKey,
  type ObjectStorage,
} from "@/lib/storage";
import { isDesignDocument, type DesignDocument } from "@/types/design";
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
  occasions: z.array(z.enum(OCCASION_SLUGS)),
  published: z.boolean(),
  hasThumbnail: z.boolean(),
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
  return { meta, design, assetIds: collectAssetIds(design.fabric) };
}

/** Marks every photo as a placeholder the customer must replace. */
export function markPlaceholders(fabric: Record<string, unknown>) {
  const marked = mapImageSources(fabric, (o) => {
    o.placeholder = true;
    o.customizable = true;
    return typeof o.src === "string" ? o.src : null;
  });
  // `templateLocked` is a customer-side stamp; a saved template never carries it.
  return {
    ...marked,
    objects: (marked.objects as Record<string, unknown>[]).map((o) => ({
      ...o,
      templateLocked: undefined,
    })),
  };
}

export async function saveTemplate(
  input: SaveTemplateInput,
  storage: ObjectStorage = getStorage(),
  makeId: () => string = newId,
  now: () => Date = () => new Date(),
): Promise<TemplateMeta> {
  const name = input.name.trim();
  if (!name) throw new TemplateError("A template needs a name", 400);
  if (!isDesignDocument(input.design, input.productId))
    throw new TemplateError("Invalid design", 400);
  const product = getProduct(input.productId);
  if (!product) throw new TemplateError(`Unknown product ${input.productId}`);

  const referenced = new Set(collectAssetIds(input.design.fabric));
  const offered = new Set(input.assets.map((a) => a.assetId));
  if (
    [...referenced].some((id) => !offered.has(id)) ||
    [...offered].some((id) => !referenced.has(id))
  )
    throw new TemplateError(
      "Sample photos don't match the photos in the design",
    );

  const id = input.id ?? makeId();
  const design: DesignDocument = {
    ...input.design,
    printArea: { ...product.printArea },
    fabric: markPlaceholders(input.design.fabric),
  };
  await Promise.all([
    storage.put(templateDesignKey(id), JSON.stringify(design), {
      contentType: "application/json",
    }),
    ...input.assets.map((a) =>
      storage.put(templateAssetKey(id, a.assetId), a.bytes, {
        contentType: a.contentType,
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
    occasions: [...new Set(input.occasions)],
    published: input.published,
    hasThumbnail: !!input.thumbnail,
    createdAt: now().toISOString(),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    ...(input.product ? { product: input.product } : {}),
  };
  const index = await readIndex(storage);
  await storage.put(templateIndexKey(), JSON.stringify([...index, meta]), {
    contentType: "application/json",
  });
  return meta;
}

/** Short-lived download URLs for a template's sample photos (bucket stays private). */
export async function templateAssetUrls(
  detail: TemplateDetail,
  storage: ObjectStorage = getStorage(),
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    detail.assetIds.map(
      async (a) =>
        [
          a,
          await storage.presignGet(templateAssetKey(detail.meta.id, a), {
            expiresInS: 10 * 60,
          }),
        ] as const,
    ),
  );
  return Object.fromEntries(entries);
}
