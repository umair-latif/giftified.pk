import { MAX_CART_LINES, MAX_LINE_QUANTITY, type CartItem } from "@/types/cart";

/**
 * Pure cart operations (no storage, no DOM) — unit-tested. `cart.ts` wraps
 * them with persistence.
 */
export class CartFullError extends Error {
  constructor() {
    super(`Your cart can hold up to ${MAX_CART_LINES} designs.`);
  }
}

const clampQty = (q: number) =>
  Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.round(q)));

export function addLine(items: CartItem[], line: CartItem): CartItem[] {
  if (items.length >= MAX_CART_LINES) throw new CartFullError();
  return [...items, { ...line, quantity: clampQty(line.quantity) }];
}

export function setLineQuantity(
  items: CartItem[],
  id: string,
  quantity: number,
): CartItem[] {
  return items.map((i) =>
    i.id === id ? { ...i, quantity: clampQty(quantity) } : i,
  );
}

export function removeLine(items: CartItem[], id: string): CartItem[] {
  return items.filter((i) => i.id !== id);
}

/**
 * "Add another size": a new line with the same design (uploaded once). If a
 * line with that design + size already exists, its quantity goes up instead.
 */
export function addSizeLine(
  items: CartItem[],
  id: string,
  size: string,
  newLineId: string,
  now: string,
): CartItem[] {
  const src = items.find((i) => i.id === id);
  if (!src) return items;
  const same = items.find(
    (i) => i.designKey === src.designKey && i.size === size,
  );
  if (same) return setLineQuantity(items, same.id, same.quantity + 1);
  return addLine(items, {
    ...src,
    id: newLineId,
    size,
    quantity: 1,
    addedAt: now,
  });
}

/** Design keys no line uses any more (their snapshots can be deleted). */
export function orphanDesignKeys(
  items: CartItem[],
  savedKeys: readonly string[],
): string[] {
  const used = new Set(items.map((i) => i.designKey));
  return savedKeys.filter((k) => !used.has(k));
}

/** Distinct designs in the cart, in cart order — what checkout uploads. */
export function distinctDesigns(
  items: CartItem[],
): { designKey: string; productId: CartItem["productId"] }[] {
  const seen = new Map<string, CartItem["productId"]>();
  for (const i of items)
    if (!seen.has(i.designKey)) seen.set(i.designKey, i.productId);
  return [...seen].map(([designKey, productId]) => ({ designKey, productId }));
}
