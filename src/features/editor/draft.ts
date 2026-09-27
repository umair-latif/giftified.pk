import type { ProductId } from "@/config/products";
import { isDesignDocument, type DesignDocument } from "@/types/design";

/**
 * Autosaved work-in-progress, per product, in this browser. Lets customers
 * go Back/Next or survive a refresh without losing their design.
 * Storage can be unavailable (private mode, quota): every call is guarded.
 */
const key = (productId: ProductId) => `giftified:draft:${productId}`;

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
