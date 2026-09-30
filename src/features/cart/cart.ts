"use client";

import { useSyncExternalStore } from "react";
import type { ProductId } from "@/config/products";
import {
  clearDraft,
  deleteSavedDesign,
  getDraftTemplate,
  loadDraft,
  saveDraft,
  savedDesignKeys,
  saveThumbnail,
  getDraftSaved,
  setDraftSaved,
} from "@/features/editor/draft";
import { lockLayersForCustomer } from "@/features/templates/lock-layers";
import { newId } from "@/lib/id";
import type { CartItem } from "@/types/cart";
import { printQualityReport } from "@/lib/print-quality";
import { isDesignDocument, type DesignDocument } from "@/types/design";
import {
  addLine,
  addSizeLine,
  orphanDesignKeys,
  removeLine,
  setLineQuantity,
} from "./cart-lines";
import {
  CART_STORAGE_KEY,
  parseCart,
  readCart,
  subscribeCart,
  writeCart,
} from "./cart-storage";

/**
 * The cart (client-side only; prices always come from the server). Lines in
 * localStorage, each line's design as a saved design (`features/editor/draft`).
 */

/**
 * Snapshots the product's current draft into a new cart line, then clears the
 * draft so the next design starts fresh. Returns the new line.
 */
export function addDraftToCart(input: {
  productId: ProductId;
  colourId: string;
  size?: string;
  quantity?: number;
  thumbnail?: string;
}): CartItem {
  const doc = loadDraft(input.productId);
  if (!doc) throw new Error("There's no design to add yet.");
  const templateId = getDraftTemplate(input.productId);
  const designKey = newId();
  if (!saveDraft(doc, designKey))
    throw new Error(
      "Your phone's storage is full, so the design couldn't be saved.",
    );
  if (input.thumbnail) saveThumbnail(designKey, input.thumbnail);
  // Still the same saved design (My designs): saving from the cart updates it.
  const savedRef = getDraftSaved(input.productId);
  if (savedRef) setDraftSaved(input.productId, savedRef, designKey);
  const line: CartItem = {
    id: newId(),
    productId: input.productId,
    colourId: input.colourId,
    ...(input.size ? { size: input.size } : {}),
    quantity: input.quantity ?? 1,
    designKey,
    ...(templateId ? { templateId } : {}),
    addedAt: new Date().toISOString(),
  };
  try {
    writeCart(addLine(readCart(), line));
  } catch (err) {
    deleteSavedDesign(designKey);
    throw err;
  }
  clearDraft(input.productId);
  return line;
}

export class TemplateNeedsPhotoError extends Error {}

/**
 * "Add to cart" on a design product page: the template's design goes into the
 * cart as it is (a saved design), as a line priced from that product. Designs
 * that still have sample photos must be customised first.
 */
export async function addTemplateToCart(input: {
  templateId: string;
  productId: ProductId;
  colourId: string;
  size?: string;
}): Promise<CartItem> {
  const res = await fetch(
    `/api/templates/${encodeURIComponent(input.templateId)}`,
  );
  if (!res.ok) throw new Error("This design isn't available any more.");
  const data = (await res.json()) as { design: unknown };
  const doc = data.design;
  if (!isDesignDocument(doc, input.productId))
    throw new Error("This design isn't available any more.");
  if (printQualityReport(doc.fabric).placeholders > 0)
    throw new TemplateNeedsPhotoError("Add your photo first.");
  const designKey = newId();
  // Locked layers stay locked if the customer later edits this line from the cart.
  const locked = { ...doc, fabric: lockLayersForCustomer(doc.fabric) };
  if (!saveDraft(locked, designKey))
    throw new Error(
      "Your phone's storage is full, so the design couldn't be saved.",
    );
  const thumb = await thumbnailDataUrl(input.templateId);
  if (thumb) saveThumbnail(designKey, thumb);
  const line: CartItem = {
    id: newId(),
    productId: input.productId,
    colourId: input.colourId,
    ...(input.size ? { size: input.size } : {}),
    quantity: 1,
    designKey,
    templateId: input.templateId,
    addedAt: new Date().toISOString(),
  };
  try {
    writeCart(addLine(readCart(), line));
  } catch (err) {
    deleteSavedDesign(designKey);
    throw err;
  }
  return line;
}

/** The design's gallery thumbnail as a small data URL for the cart (null if unavailable). */
async function thumbnailDataUrl(templateId: string): Promise<string | null> {
  try {
    const r = await fetch(
      `/api/templates/${encodeURIComponent(templateId)}/thumbnail`,
    );
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function getCartItem(id: string): CartItem | null {
  return readCart().find((i) => i.id === id) ?? null;
}

export function getCartDesign(item: CartItem): DesignDocument | null {
  return loadDraft(item.productId, item.designKey);
}

export function updateQuantity(id: string, quantity: number): void {
  writeCart(setLineQuantity(readCart(), id, quantity));
}

export function removeFromCart(id: string): void {
  writeCart(removeLine(readCart(), id));
  collectGarbage();
}

export function addAnotherSize(id: string, size: string): void {
  writeCart(
    addSizeLine(readCart(), id, size, newId(), new Date().toISOString()),
  );
}

export function clearCart(): void {
  writeCart([]);
  collectGarbage();
}

/** Deletes saved designs (and thumbnails) no cart line uses. */
export function collectGarbage(): void {
  const items = readCart();
  for (const key of orphanDesignKeys(items, savedDesignKeys()))
    deleteSavedDesign(key);
}

// --- React ------------------------------------------------------------------

let cachedRaw: string | null | undefined;
let cachedItems: CartItem[] = [];

function snapshot(): CartItem[] | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    /* blocked */
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parseCart(raw);
  }
  return cachedItems;
}

/** Live cart lines; `null` until mounted (server render / hydration). */
export function useCart(): CartItem[] | null {
  return useSyncExternalStore(subscribeCart, snapshot, () => null);
}
