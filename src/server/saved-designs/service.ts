import { z } from "zod";
import { getProduct } from "@/config/products";
import { collectAssetIds } from "@/features/editor/assets/asset-ref";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/features/editor/assets/prepare-image";
import {
  SAVED_DESIGN_NAME_MAX,
  sortSavedDesigns,
} from "@/lib/commerce/saved-designs";
import {
  MAX_SAVED_DESIGNS,
  type CommerceClient,
  type SavedDesign,
} from "@/lib/commerce/types";
import {
  accountFolder,
  assertSafeId,
  assetKey,
  designFolder,
  designKey,
  designThumbKey,
  savedAssetKey,
  savedDesignFolder,
  savedDesignKey,
  savedPendingKey,
  savedThumbKey,
} from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import { isDesignDocument, type DesignDocument } from "@/types/design";
import type { OrderId, OrderLineInput } from "@/types/order";

/**
 * Task 22 — saved designs. Pure logic with injected deps (route handlers,
 * Server Actions and tests call the same code).
 *
 * Saving is two steps so a half-finished upload never replaces a good copy:
 *  1. `startSave` writes `pending.json` and hands back direct-upload URLs for
 *     the photos not already stored (and the thumbnail);
 *  2. `finishSave` checks every photo arrived, promotes pending → design.json,
 *     drops photos the design no longer uses and updates the list in
 *     WooCommerce customer meta.
 * Unlike checkout, a saved design may keep sample photos or a blurry photo:
 * it is work in progress, and checkout still checks before printing.
 */

export interface SavedDesignDeps {
  commerce: Pick<
    CommerceClient,
    "listSavedDesigns" | "setSavedDesigns" | "getCustomerOrder"
  >;
  storage: Pick<
    ObjectStorage,
    | "put"
    | "get"
    | "head"
    | "delete"
    | "list"
    | "deletePrefix"
    | "presignPut"
    | "presignGet"
  >;
  now: () => number;
  makeId: () => string;
}

export class SavedDesignError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 422,
  ) {
    super(message);
  }
}

const safeId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const nameSchema = z.string().trim().min(1).max(SAVED_DESIGN_NAME_MAX);

export const startSaveSchema = z.object({
  /** Update this saved design instead of making a new one. */
  savedId: safeId.optional(),
  design: z.unknown(),
  assets: z
    .array(
      z.object({
        assetId: safeId,
        contentType: z.enum(ACCEPTED_IMAGE_TYPES),
        size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      }),
    )
    .max(20),
  /** The client will upload a thumbnail. */
  thumbnail: z.boolean().default(false),
});

export const finishSaveSchema = z.object({
  name: z.string().optional(),
  /** The design product the draft was started from (task 26). */
  templateId: safeId.optional(),
});

export const renameSchema = z.object({ name: nameSchema });

export interface SaveTicket {
  savedId: string;
  uploads: { assetId: string; url: string; contentType: string }[];
  thumbnailUrl?: string;
}

const UPLOAD_TTL_S = 30 * 60;
const THUMB_TYPE = "image/webp";
/** Order statuses after which a design is no longer needed for printing. */
const CLOSED = new Set(["completed", "cancelled"]);

export const FULL_MESSAGE = `You already have ${MAX_SAVED_DESIGNS} saved designs. Delete one in Your account → My designs to save this one.`;

export async function startSave(
  customerId: number,
  body: unknown,
  deps: SavedDesignDeps,
): Promise<SaveTicket> {
  const parsed = startSaveSchema.safeParse(body);
  if (!parsed.success) throw new SavedDesignError("Invalid request", 400);
  const { design, assets, thumbnail } = parsed.data;
  if (!isDesignDocument(design))
    throw new SavedDesignError("Invalid design", 400);
  const product = getProduct(design.productId);
  if (!product)
    throw new SavedDesignError(`Unknown product ${design.productId}`, 422);

  const referenced = new Set(collectAssetIds(design.fabric));
  const offered = new Set(assets.map((a) => a.assetId));
  if (
    referenced.size !== offered.size ||
    [...referenced].some((id) => !offered.has(id))
  )
    throw new SavedDesignError(
      "Photos in the design don't match the uploaded photos",
      422,
    );

  const list = await deps.commerce.listSavedDesigns(customerId);
  const existing = parsed.data.savedId
    ? list.find((d) => d.id === parsed.data.savedId && d.source === "account")
    : undefined;
  // Deleted on another device meanwhile → save it as a new one.
  if (!existing && list.length >= MAX_SAVED_DESIGNS)
    throw new SavedDesignError(FULL_MESSAGE, 409);
  if (existing && existing.productId !== design.productId)
    throw new SavedDesignError("That saved design is for another product", 422);
  const savedId = existing?.id ?? deps.makeId();

  const stored: DesignDocument = {
    ...design,
    printArea: { ...product.printArea },
  };
  await deps.storage.put(
    savedPendingKey(customerId, savedId),
    JSON.stringify(stored),
    { contentType: "application/json" },
  );

  // Photos are keyed by their local asset id, which never changes for a
  // photo: one already stored (same size) is not uploaded again.
  const uploads: SaveTicket["uploads"] = [];
  for (const a of assets) {
    const key = savedAssetKey(customerId, savedId, a.assetId);
    const have = existing ? await deps.storage.head(key) : null;
    if (have && have.size === a.size) continue;
    uploads.push({
      assetId: a.assetId,
      contentType: a.contentType,
      url: await deps.storage.presignPut(key, {
        contentType: a.contentType,
        expiresInS: UPLOAD_TTL_S,
      }),
    });
  }
  return {
    savedId,
    uploads,
    ...(thumbnail
      ? {
          thumbnailUrl: await deps.storage.presignPut(
            savedThumbKey(customerId, savedId),
            { contentType: THUMB_TYPE, expiresInS: UPLOAD_TTL_S },
          ),
        }
      : {}),
  };
}

export async function finishSave(
  customerId: number,
  savedId: string,
  body: unknown,
  deps: SavedDesignDeps,
): Promise<SavedDesign> {
  assertSafeId(savedId, "savedId");
  const parsed = finishSaveSchema.safeParse(body);
  if (!parsed.success) throw new SavedDesignError("Invalid request", 400);
  const list = await deps.commerce.listSavedDesigns(customerId);
  const existing = list.find((d) => d.id === savedId);

  const raw = await deps.storage.get(savedPendingKey(customerId, savedId));
  if (!raw) {
    // A retried finish after it already succeeded.
    if (existing) return existing;
    throw new SavedDesignError("Nothing to save. Please try again.", 404);
  }
  const design: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!isDesignDocument(design))
    throw new SavedDesignError("Invalid design", 400);
  const assetIds = collectAssetIds(design.fabric);
  const missing = (
    await Promise.all(
      assetIds.map((a) =>
        deps.storage.head(savedAssetKey(customerId, savedId, a)),
      ),
    )
  ).some((h) => !h);
  if (missing)
    throw new SavedDesignError(
      "A photo didn't finish uploading. Check your connection and try again.",
      409,
    );

  if (!existing && list.length >= MAX_SAVED_DESIGNS) {
    await deps.storage.deletePrefix(savedDesignFolder(customerId, savedId));
    throw new SavedDesignError(FULL_MESSAGE, 409);
  }

  await deps.storage.put(savedDesignKey(customerId, savedId), raw, {
    contentType: "application/json",
  });
  await deps.storage.delete(savedPendingKey(customerId, savedId));
  await deleteUnusedPhotos(customerId, savedId, new Set(assetIds), deps);

  const product = getProduct(design.productId);
  const cleanName = nameSchema.safeParse(parsed.data.name ?? "");
  const entry: SavedDesign = {
    id: savedId,
    productId: design.productId,
    name: cleanName.success
      ? cleanName.data
      : (existing?.name ?? product?.name ?? "My design"),
    source: "account",
    ...(parsed.data.templateId ? { templateId: parsed.data.templateId } : {}),
    hasThumbnail: !!(await deps.storage.head(
      savedThumbKey(customerId, savedId),
    )),
    updatedAt: new Date(deps.now()).toISOString(),
  };
  await deps.commerce.setSavedDesigns(
    customerId,
    sortSavedDesigns([entry, ...list.filter((d) => d.id !== savedId)]),
  );
  return entry;
}

async function deleteUnusedPhotos(
  customerId: number,
  savedId: string,
  keep: Set<string>,
  deps: SavedDesignDeps,
) {
  const prefix = `${savedDesignFolder(customerId, savedId)}assets/`;
  let cursor: string | undefined;
  const drop: string[] = [];
  do {
    const page = await deps.storage.list(prefix, cursor ? { cursor } : {});
    for (const o of page.objects)
      if (!keep.has(o.key.slice(prefix.length))) drop.push(o.key);
    cursor = page.cursor;
  } while (cursor);
  for (const key of drop) await deps.storage.delete(key);
}

/** Where a saved design's files live. */
function locate(customerId: number, d: SavedDesign) {
  return d.source === "account"
    ? {
        design: savedDesignKey(customerId, d.id),
        asset: (a: string) => savedAssetKey(customerId, d.id, a),
        thumb: savedThumbKey(customerId, d.id),
        folder: savedDesignFolder(customerId, d.id),
      }
    : {
        design: designKey(d.id),
        asset: (a: string) => assetKey(d.id, a),
        thumb: designThumbKey(d.id),
        folder: designFolder(d.id),
      };
}

async function mustFind(
  customerId: number,
  savedId: string,
  deps: SavedDesignDeps,
): Promise<{ entry: SavedDesign; list: SavedDesign[] }> {
  const list = await deps.commerce.listSavedDesigns(customerId);
  const entry = list.find((d) => d.id === savedId);
  if (!entry) throw new SavedDesignError("Design not found", 404);
  return { entry, list };
}

export interface OpenedDesign {
  entry: SavedDesign;
  design: DesignDocument;
  /** Short-lived download URLs of the ORIGINAL photos, by asset id. */
  assetUrls: Record<string, string>;
}

/** The design and its photos, to continue editing on any device. */
export async function openSavedDesign(
  customerId: number,
  savedId: string,
  deps: SavedDesignDeps,
): Promise<OpenedDesign> {
  const { entry } = await mustFind(customerId, savedId, deps);
  const where = locate(customerId, entry);
  const raw = await deps.storage.get(where.design);
  if (!raw)
    throw new SavedDesignError(
      "This design's files are no longer available.",
      404,
    );
  const design: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!isDesignDocument(design, entry.productId))
    throw new SavedDesignError("This design can't be opened.", 422);
  const assetUrls: Record<string, string> = {};
  for (const a of collectAssetIds(design.fabric))
    assetUrls[a] = await deps.storage.presignGet(where.asset(a), {
      expiresInS: 15 * 60,
    });
  return { entry, design, assetUrls };
}

/** Thumbnail URLs for the list page (1 hour), by saved design id. */
export async function thumbnailUrls(
  customerId: number,
  list: SavedDesign[],
  deps: Pick<SavedDesignDeps, "storage">,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const d of list)
    if (d.hasThumbnail)
      out[d.id] = await deps.storage.presignGet(locate(customerId, d).thumb, {
        expiresInS: 3600,
      });
  return out;
}

export async function renameSavedDesign(
  customerId: number,
  savedId: string,
  name: unknown,
  deps: SavedDesignDeps,
): Promise<void> {
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success)
    throw new SavedDesignError(
      `Give it a name of 1–${SAVED_DESIGN_NAME_MAX} characters.`,
      400,
    );
  const { list } = await mustFind(customerId, savedId, deps);
  await deps.commerce.setSavedDesigns(
    customerId,
    list.map((d) => (d.id === savedId ? { ...d, name: parsed.data } : d)),
  );
}

export const IN_PRODUCTION_MESSAGE =
  "This design is on an order we're still making. You can delete it once the order is delivered.";

/** True when the design's order is still open (its files are needed to print). */
async function stillPrinting(
  customerId: number,
  d: SavedDesign,
  deps: SavedDesignDeps,
): Promise<boolean> {
  if (d.source !== "order" || !d.orderId) return false;
  const order = await deps.commerce.getCustomerOrder(customerId, d.orderId);
  return !!order && !CLOSED.has(order.status);
}

/**
 * Deletes the design AND its photos from storage, then the list entry
 * (files first: a failed list update leaves an entry that can be deleted
 * again, never photos nobody can find).
 */
export async function deleteSavedDesign(
  customerId: number,
  savedId: string,
  deps: SavedDesignDeps,
): Promise<void> {
  const { entry, list } = await mustFind(customerId, savedId, deps);
  if (await stillPrinting(customerId, entry, deps))
    throw new SavedDesignError(IN_PRODUCTION_MESSAGE, 409);
  await deps.storage.deletePrefix(locate(customerId, entry).folder);
  await deps.commerce.setSavedDesigns(
    customerId,
    list.filter((d) => d.id !== savedId),
  );
}

/**
 * Account deletion (task 21): every saved design and photo of the customer.
 * Designs of orders still being made are kept (the caller refuses to delete
 * an account with open orders; this is a second guard). Returns how many
 * designs were kept.
 */
export async function deleteAllSavedDesigns(
  customerId: number,
  deps: SavedDesignDeps,
): Promise<{ deleted: number; kept: number }> {
  const list = await deps.commerce.listSavedDesigns(customerId);
  let deleted = 0;
  const kept: SavedDesign[] = [];
  for (const d of list) {
    if (await stillPrinting(customerId, d, deps)) {
      kept.push(d);
      continue;
    }
    if (d.source === "order")
      await deps.storage.deletePrefix(designFolder(d.id));
    deleted++;
  }
  // Everything under accounts/<id>/, including anything half-saved.
  await deps.storage.deletePrefix(accountFolder(customerId));
  await deps.commerce.setSavedDesigns(customerId, kept);
  return { deleted, kept: kept.length };
}

/**
 * After a signed-in checkout: the order's designs join "My designs", so the
 * customer can reorder or reuse them on any device. Best effort — when the
 * list is full the rest is skipped (the files stay with the order anyway).
 */
export async function addOrderDesigns(
  customerId: number,
  order: {
    id: OrderId;
    lines: Pick<OrderLineInput, "designId" | "productId" | "templateId">[];
  },
  deps: SavedDesignDeps,
): Promise<number> {
  const list = await deps.commerce.listSavedDesigns(customerId);
  const have = new Set(list.map((d) => d.id));
  const added: SavedDesign[] = [];
  for (const line of order.lines) {
    if (have.has(line.designId)) continue;
    if (list.length + added.length >= MAX_SAVED_DESIGNS) break;
    have.add(line.designId);
    const product = getProduct(line.productId);
    added.push({
      id: assertSafeId(line.designId, "designId"),
      productId: line.productId,
      name: `${product?.name ?? "Design"} · order #${order.id}`.slice(
        0,
        SAVED_DESIGN_NAME_MAX,
      ),
      source: "order",
      orderId: order.id,
      ...(line.templateId ? { templateId: line.templateId } : {}),
      hasThumbnail: !!(await deps.storage.head(designThumbKey(line.designId))),
      updatedAt: new Date(deps.now()).toISOString(),
    });
  }
  if (added.length)
    await deps.commerce.setSavedDesigns(
      customerId,
      sortSavedDesigns([...added, ...list]),
    );
  return added.length;
}
