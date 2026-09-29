import type { ProductId } from "@/config/products";

/**
 * SHARED CONTRACT — one line in the customer's cart (client-side only; no
 * prices: they always come from the server). Owner: lead. Task 12 builds the
 * store on top of `src/features/cart/cart-storage.ts`.
 */
export interface CartItem {
  /** `newId()`; stable for the life of the line. */
  id: string;
  productId: ProductId;
  colourId: string;
  size?: string;
  /** 1–10. */
  quantity: number;
  /**
   * Local key of the design snapshot (IndexedDB). Several lines may share one
   * (same design, different sizes) — it is uploaded once at checkout.
   */
  designKey: string;
  /**
   * Set when the line is a design product (task 26): priced from that
   * design's WooCommerce product instead of the base product's variant.
   */
  templateId?: string;
  /** ISO 8601. */
  addedAt: string;
}

export const MAX_CART_LINES = 10;
export const MAX_LINE_QUANTITY = 10;
