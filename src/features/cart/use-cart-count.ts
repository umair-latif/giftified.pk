"use client";

import { useSyncExternalStore } from "react";
import { cartCount, readCart, subscribeCart } from "./cart-storage";

/** Number of items in the cart; 0 on the server and before hydration. */
export function useCartCount(): number {
  return useSyncExternalStore(
    subscribeCart,
    () => cartCount(readCart()),
    () => 0,
  );
}
