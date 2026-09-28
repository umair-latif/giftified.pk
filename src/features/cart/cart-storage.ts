import { z } from "zod";
import { MAX_CART_LINES, MAX_LINE_QUANTITY, type CartItem } from "@/types/cart";

/**
 * Low-level cart persistence (localStorage) + change subscription. Task 12
 * builds the full cart store on top; the header badge only needs `useCartCount`.
 * Every read validates, so a corrupted or old entry never breaks a page.
 */
export const CART_STORAGE_KEY = "giftified:cart";
const CHANGE_EVENT = "giftified:cart-change";

const itemSchema = z.object({
  id: z.string().min(1).max(64),
  productId: z.enum(["mug", "tshirt", "hoodie"]),
  colourId: z.string().min(1).max(40),
  size: z.string().max(10).optional(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  designKey: z.string().min(1).max(64),
  addedAt: z.string(),
});

export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((d) => itemSchema.safeParse(d))
      .filter((r) => r.success)
      .map((r) => r.data as CartItem)
      .slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}

export function readCart(): CartItem[] {
  try {
    return parseCart(localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_CART_LINES)),
    );
  } catch {
    /* storage full or blocked: the cart lives for this page only */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Fires on changes in this tab and in other tabs. */
export function subscribeCart(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Total quantity across lines. */
export const cartCount = (items: CartItem[]): number =>
  items.reduce((n, i) => n + i.quantity, 0);
