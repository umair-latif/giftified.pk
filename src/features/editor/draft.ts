import type { ProductId } from "@/config/products";
import { isDesignDocument, type DesignDocument } from "@/types/design";
import { collectAssetIds } from "./assets/asset-ref";

/**
 * Autosaved work-in-progress, per product, in this browser. Lets customers
 * go Back/Next or survive a refresh without losing their design.
 * Storage can be unavailable (private mode, quota): every call is guarded.
 */
const PREFIX = "giftified:draft:";
const key = (productId: ProductId) => `${PREFIX}${productId}`;

export function saveDraft(doc: DesignDocument): void {
  try {
    localStorage.setItem(key(doc.productId), JSON.stringify(doc));
  } catch {
    /* storage full or blocked: the editor still works, just without autosave */
  }
}

export function loadDraft(productId: ProductId): DesignDocument | null {
  try {
    const raw = localStorage.getItem(key(productId));
    if (!raw) return null;
    const doc: unknown = JSON.parse(raw);
    return isDesignDocument(doc, productId) ? doc : null;
  } catch {
    return null;
  }
}

export function clearDraft(productId: ProductId): void {
  try {
    localStorage.removeItem(key(productId));
  } catch {
    /* ignore */
  }
}

/** Asset IDs referenced by every saved draft (all products) — used to prune unused photos. */
export function allDraftAssetIds(): Set<string> {
  const ids = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const doc: unknown = JSON.parse(raw);
      if (isDesignDocument(doc))
        collectAssetIds(doc.fabric).forEach((id) => ids.add(id));
    }
  } catch {
    /* storage blocked: prune nothing */
  }
  return ids;
}
