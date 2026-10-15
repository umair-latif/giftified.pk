"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The garment size picked on the product page (per product, this phone). The
 * preview screen starts with it, so the shopper doesn't pick it twice. A size
 * that isn't sold in the chosen colour is ignored there.
 */
const KEY = (productId: string) => `giftified:size:${productId}`;
const listeners = new Set<() => void>();

export function readProductSize(productId: string): string | null {
  try {
    return window.localStorage.getItem(KEY(productId));
  } catch {
    return null;
  }
}

export function writeProductSize(productId: string, size: string | null) {
  try {
    if (size) window.localStorage.setItem(KEY(productId), size);
    else window.localStorage.removeItem(KEY(productId));
  } catch {
    // Storage blocked: the shopper picks the size again on the preview.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** [size picked for this product (null = none), setter]. Null on the server. */
export function useProductSize(
  productId: string,
): [string | null, (size: string | null) => void] {
  const size = useSyncExternalStore(
    subscribe,
    () => readProductSize(productId),
    () => null,
  );
  const set = useCallback(
    (s: string | null) => writeProductSize(productId, s),
    [productId],
  );
  return [size, set];
}
