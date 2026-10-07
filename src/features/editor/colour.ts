"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ProductConfig } from "@/config/products";

/**
 * The garment colour the customer picked for a product (per product, kept in
 * localStorage so Back/Next and refresh keep it). Always one of the product's
 * `baseColors`; anything else (stale value, storage blocked) falls back to the
 * first colour.
 */
const KEY = (productId: string) => `giftified:colour:${productId}`;
const listeners = new Set<() => void>();

function read(productId: string): string | null {
  try {
    return window.localStorage.getItem(KEY(productId));
  } catch {
    return null;
  }
}

/** Pure: the colour id to use for this product given a stored value. */
export function resolveColourId(
  product: Pick<ProductConfig, "baseColors">,
  stored: string | null | undefined,
): string {
  const found = product.baseColors.find((c) => c.id === stored);
  return found?.id ?? product.baseColors[0]?.id ?? "white";
}

export function writeProductColour(productId: string, colourId: string) {
  try {
    window.localStorage.setItem(KEY(productId), colourId);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
    memory.set(productId, colourId);
  }
  listeners.forEach((l) => l());
}

const memory = new Map<string, string>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useProductColour(
  product: Pick<ProductConfig, "id" | "baseColors">,
): [string, (colourId: string) => void] {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(product.id) ?? memory.get(product.id) ?? null,
    () => null,
  );
  const set = useCallback(
    (colourId: string) => writeProductColour(product.id, colourId),
    [product.id],
  );
  return [resolveColourId(product, stored), set];
}
