"use client";

import { useSyncExternalStore } from "react";
import type { ProductId } from "@/config/products";
import {
  clearDraft,
  deleteSavedDesign,
  loadDraft,
  saveDraft,
  savedDesignKeys,
  saveThumbnail,
} from "@/features/editor/draft";
import { newId } from "@/lib/id";
import type { CartItem } from "@/types/cart";
import type { DesignDocument } from "@/types/design";
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
  const designKey = newId();
  if (!saveDraft(doc, designKey))
    throw new Error(
      "Your phone's storage is full, so the design couldn't be saved.",
    );
  if (input.thumbnail) saveThumbnail(designKey, input.thumbnail);
  const line: CartItem = {
    id: newId(),
    productId: input.productId,
    colourId: input.colourId,
    ...(input.size ? { size: input.size } : {}),
    quantity: input.quantity ?? 1,
    designKey,
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
