import "server-only";
import type { CommerceClient } from "@/lib/commerce";
import {
  getStorage,
  templateFolder,
  templateIndexKey,
  type ObjectStorage,
} from "@/lib/storage";
import { listTemplates } from "./store";
import type { TemplateMeta } from "./types";

/**
 * Templates whose WooCommerce product no longer exists (deleted, trashed or
 * un-published in WP admin). They are already hidden from customers
 * (`filterLiveTemplates`); this finds them so their files can be removed.
 */
export async function findOrphanedTemplates(
  commerce: CommerceClient,
  storage: ObjectStorage = getStorage(),
): Promise<TemplateMeta[]> {
  const all = await listTemplates({ includeUnpublished: true }, storage);
  const linked = all.filter((t) => t.product);
  if (linked.length === 0) return [];
  const live = new Set(
    (await commerce.listDesignProducts(linked.map((t) => t.id))).map(
      (p) => p.templateId,
    ),
  );
  // A draft product (never published) is not an orphan: the founder may still publish it.
  return linked.filter((t) => !live.has(t.id) && t.published);
}

/** Deletes a template's files and its entry in the index. Returns how many files went. */
export async function deleteTemplate(
  id: string,
  storage: ObjectStorage = getStorage(),
): Promise<number> {
  const removed = await storage.deletePrefix(templateFolder(id));
  const raw = await storage.get(templateIndexKey());
  if (raw) {
    const index = JSON.parse(new TextDecoder().decode(raw)) as { id: string }[];
    await storage.put(
      templateIndexKey(),
      JSON.stringify(index.filter((t) => t.id !== id)),
      { contentType: "application/json" },
    );
  }
  return removed;
}
