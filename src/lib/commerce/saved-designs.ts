import { z } from "zod";
import { MAX_SAVED_DESIGNS, type SavedDesign } from "./types";

/**
 * Parsing for the `giftified_saved_designs` customer meta (task 22). The meta is
 * written only by us, but WP admin lets anyone edit customer meta by hand, so
 * every read goes through this schema and bad entries are dropped instead of
 * breaking the account page.
 */
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const SAVED_DESIGN_NAME_MAX = 60;

export const savedDesignSchema = z.object({
  id: z.string().regex(SAFE_ID),
  productId: z.enum(["mug", "tshirt", "hoodie"]),
  name: z.string().trim().min(1).max(SAVED_DESIGN_NAME_MAX),
  source: z.enum(["account", "order"]),
  orderId: z.number().int().positive().optional(),
  templateId: z.string().regex(SAFE_ID).optional(),
  hasThumbnail: z.boolean(),
  updatedAt: z.string().min(1),
});

/** Newest first, unique ids, valid entries only, at most MAX_SAVED_DESIGNS. */
export function parseSavedDesigns(raw: unknown): SavedDesign[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: SavedDesign[] = [];
  for (const item of value) {
    const r = savedDesignSchema.safeParse(item);
    if (!r.success || seen.has(r.data.id)) continue;
    seen.add(r.data.id);
    const { orderId, templateId, ...rest } = r.data;
    out.push({
      ...rest,
      ...(orderId !== undefined ? { orderId } : {}),
      ...(templateId !== undefined ? { templateId } : {}),
    });
  }
  return sortSavedDesigns(out).slice(0, MAX_SAVED_DESIGNS);
}

export function sortSavedDesigns(list: SavedDesign[]): SavedDesign[] {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Throws on a list the adapter must not store (caller bug). */
export function assertSavedDesignList(list: SavedDesign[]): void {
  if (list.length > MAX_SAVED_DESIGNS)
    throw new Error(`At most ${MAX_SAVED_DESIGNS} saved designs`);
  const ids = new Set<string>();
  for (const d of list) {
    savedDesignSchema.parse(d);
    if (ids.has(d.id)) throw new Error(`Duplicate saved design ${d.id}`);
    ids.add(d.id);
  }
}
