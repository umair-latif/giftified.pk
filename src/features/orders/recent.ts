import { z } from "zod";

/**
 * "Your recent orders on this phone": private order links kept in this
 * browser so a guest can reopen them from /track without typing anything.
 * localStorage only; every access is wrapped because storage can be blocked
 * (private mode, full disk) and must never break a page.
 */
export const RECENT_ORDERS_KEY = "giftified:recent-orders";
export const MAX_RECENT_ORDERS = 20;

export interface RecentOrder {
  id: number;
  /** Order-link token (the `t` of /order/<id>?t=…). */
  t: string;
  createdAt: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const schema = z.object({
  id: z.number().int().positive(),
  t: z.string().regex(/^[\w-]{22}$/),
  createdAt: z.string().max(40),
});

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function parseRecentOrders(raw: string | null): RecentOrder[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .map((d) => schema.safeParse(d))
      .filter((r) => r.success)
      .map((r) => r.data)
      .slice(0, MAX_RECENT_ORDERS);
  } catch {
    return [];
  }
}

/** Newest first. */
export function listRecentOrders(
  storage: StorageLike | null = defaultStorage(),
): RecentOrder[] {
  try {
    return parseRecentOrders(storage?.getItem(RECENT_ORDERS_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Adds or refreshes an order (moves it to the top), keeping the newest 20. */
export function saveRecentOrder(
  order: RecentOrder,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage || !schema.safeParse(order).success) return;
  const next = [
    { id: order.id, t: order.t, createdAt: order.createdAt },
    ...listRecentOrders(storage).filter((o) => o.id !== order.id),
  ].slice(0, MAX_RECENT_ORDERS);
  try {
    storage.setItem(RECENT_ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: nothing to remember */
  }
}

export const recentOrderUrl = (o: RecentOrder): string =>
  `/order/${o.id}?t=${encodeURIComponent(o.t)}`;
