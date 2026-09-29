import type { ProductId } from "@/config/products";
import { isDesignDocument, type DesignDocument } from "@/types/design";
import { collectAssetIds } from "./assets/asset-ref";

/**
 * Designs saved in this browser (localStorage; small JSON — photos are only
 * referenced as `asset:<id>`, their files live in IndexedDB).
 *
 * - **Draft**: the design being made, one per product (`giftified:draft:<product>`).
 *   Lets customers go Back/Next or refresh without losing work.
 * - **Saved design**: a snapshot owned by a cart line (`giftified:design:<designKey>`).
 *   Editing a cart item (`/design/mug?item=…`) edits its saved design in place.
 *
 * Storage can be unavailable (private mode, quota): every call is guarded.
 */
const DRAFT_PREFIX = "giftified:draft:";
const DESIGN_PREFIX = "giftified:design:";
const THUMB_PREFIX = "giftified:thumb:";
const DRAFT_TEMPLATE_PREFIX = "giftified:draft-template:";

const storageKey = (productId: ProductId, designKey?: string) =>
  designKey ? `${DESIGN_PREFIX}${designKey}` : `${DRAFT_PREFIX}${productId}`;

/** Saves the product's draft, or the saved design `designKey` when given. */
export function saveDraft(doc: DesignDocument, designKey?: string): boolean {
  try {
    localStorage.setItem(
      storageKey(doc.productId, designKey),
      JSON.stringify(doc),
    );
    return true;
  } catch {
    /* storage full or blocked: the editor still works, just without autosave */
    return false;
  }
}

export function loadDraft(
  productId: ProductId,
  designKey?: string,
): DesignDocument | null {
  try {
    const raw = localStorage.getItem(storageKey(productId, designKey));
    if (!raw) return null;
    const doc: unknown = JSON.parse(raw);
    return isDesignDocument(doc, productId) ? doc : null;
  } catch {
    return null;
  }
}

/**
 * The design product (template) a draft was started from (task 26): the cart
 * line keeps it so the design is priced as that product.
 */
export function setDraftTemplate(productId: ProductId, templateId: string) {
  try {
    localStorage.setItem(`${DRAFT_TEMPLATE_PREFIX}${productId}`, templateId);
  } catch {
    /* storage blocked: the line is then priced as a plain product */
  }
}

export function getDraftTemplate(productId: ProductId): string | undefined {
  try {
    return (
      localStorage.getItem(`${DRAFT_TEMPLATE_PREFIX}${productId}`) ?? undefined
    );
  } catch {
    return undefined;
  }
}

export function clearDraft(productId: ProductId, designKey?: string): void {
  try {
    localStorage.removeItem(storageKey(productId, designKey));
    if (!designKey)
      localStorage.removeItem(`${DRAFT_TEMPLATE_PREFIX}${productId}`);
    if (designKey) localStorage.removeItem(`${THUMB_PREFIX}${designKey}`);
  } catch {
    /* ignore */
  }
}

/** Deletes a saved (cart) design and its thumbnail. */
export function deleteSavedDesign(designKey: string): void {
  try {
    localStorage.removeItem(`${DESIGN_PREFIX}${designKey}`);
    localStorage.removeItem(`${THUMB_PREFIX}${designKey}`);
  } catch {
    /* ignore */
  }
}

/** Keys of every saved (cart) design in this browser. */
export function savedDesignKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(DESIGN_PREFIX))
        keys.push(k.slice(DESIGN_PREFIX.length));
    }
  } catch {
    /* storage blocked */
  }
  return keys;
}

/** Small WebP data URL shown in the cart. */
export function saveThumbnail(designKey: string, dataUrl: string): void {
  try {
    localStorage.setItem(`${THUMB_PREFIX}${designKey}`, dataUrl);
  } catch {
    /* no thumbnail is fine */
  }
}

export function loadThumbnail(designKey: string): string | null {
  try {
    const v = localStorage.getItem(`${THUMB_PREFIX}${designKey}`);
    return v?.startsWith("data:image/") ? v : null;
  } catch {
    return null;
  }
}

/**
 * Asset IDs referenced by every draft AND every saved cart design — photos
 * outside this set can be deleted from IndexedDB.
 */
export function allDraftAssetIds(): Set<string> {
  const ids = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(DRAFT_PREFIX) && !k?.startsWith(DESIGN_PREFIX))
        continue;
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
