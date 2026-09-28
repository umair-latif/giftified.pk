import { describe, expect, it } from "vitest";
import {
  listRecentOrders,
  MAX_RECENT_ORDERS,
  parseRecentOrders,
  RECENT_ORDERS_KEY,
  recentOrderUrl,
  saveRecentOrder,
} from "@/features/orders/recent";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

const token = (n: number) => `tok${String(n).padStart(19, "0")}`;
const entry = (id: number) => ({
  id,
  t: token(id),
  createdAt: "2026-09-28T10:00:00.000Z",
});

describe("recent orders on this phone", () => {
  it("saves newest first, de-duplicates and keeps at most 20", () => {
    const s = memoryStorage();
    for (let id = 1; id <= 25; id++) saveRecentOrder(entry(id), s);
    saveRecentOrder(entry(10), s); // reopened → moves to the top
    const list = listRecentOrders(s);
    expect(list).toHaveLength(MAX_RECENT_ORDERS);
    expect(list.map((o) => o.id).slice(0, 3)).toEqual([10, 25, 24]);
    expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
  });

  it("ignores garbage and invalid entries", () => {
    expect(parseRecentOrders(null)).toEqual([]);
    expect(parseRecentOrders("{nope")).toEqual([]);
    expect(parseRecentOrders('{"id":1}')).toEqual([]);
    expect(
      parseRecentOrders(
        JSON.stringify([
          entry(1),
          { id: 2, t: "short" },
          { id: -1, t: token(1), createdAt: "" },
          "x",
        ]),
      ),
    ).toEqual([entry(1)]);
    const s = memoryStorage();
    saveRecentOrder({ id: 3, t: "not-a-token", createdAt: "x" }, s);
    expect(s.data.has(RECENT_ORDERS_KEY)).toBe(false);
  });

  it("never throws when storage is blocked or missing", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(listRecentOrders(broken)).toEqual([]);
    expect(() => saveRecentOrder(entry(1), broken)).not.toThrow();
    expect(listRecentOrders(null)).toEqual([]);
    expect(() => saveRecentOrder(entry(1), null)).not.toThrow();
    // No localStorage in the Node test environment: the defaults cope too.
    expect(listRecentOrders()).toEqual([]);
  });

  it("builds the private order link", () => {
    expect(recentOrderUrl(entry(7))).toBe(`/order/7?t=${token(7)}`);
  });
});
