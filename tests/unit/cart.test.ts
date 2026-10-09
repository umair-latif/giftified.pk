import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addLine,
  addSizeLine,
  CartFullError,
  distinctDesigns,
  orphanDesignKeys,
  removeLine,
  setLineQuantity,
  setLineSize,
} from "@/features/cart/cart-lines";
import {
  allDraftAssetIds,
  deleteSavedDesign,
  loadDraft,
  loadThumbnail,
  savedDesignKeys,
  saveDraft,
  saveThumbnail,
} from "@/features/editor/draft";
import type { CartItem } from "@/types/cart";
import type { DesignDocument } from "@/types/design";

const line = (
  id: string,
  designKey = `d-${id}`,
  extra: Partial<CartItem> = {},
): CartItem => ({
  id,
  productId: "mug",
  colourId: "white",
  quantity: 1,
  designKey,
  addedAt: "2026-09-28T10:00:00.000Z",
  ...extra,
});

describe("cart lines", () => {
  it("adds, clamps quantity, removes", () => {
    let items = addLine([], line("a", "d1", { quantity: 50 }));
    expect(items[0]?.quantity).toBe(10);
    items = setLineQuantity(items, "a", 0);
    expect(items[0]?.quantity).toBe(1);
    items = setLineQuantity(items, "a", 3);
    expect(items[0]?.quantity).toBe(3);
    expect(removeLine(items, "a")).toEqual([]);
  });

  it("refuses an 11th design", () => {
    const ten = Array.from({ length: 10 }, (_, i) => line(String(i)));
    expect(() => addLine(ten, line("x"))).toThrow(CartFullError);
  });

  it("adds another size with the same design, or bumps an existing one", () => {
    let items = [line("a", "d1", { size: "M" })];
    items = addSizeLine(items, "a", "L", "b", "now");
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({
      id: "b",
      designKey: "d1",
      size: "L",
      quantity: 1,
    });
    items = addSizeLine(items, "a", "L", "c", "now");
    expect(items).toHaveLength(2);
    expect(items[1]?.quantity).toBe(2);
  });

  it("changes a line's size in place", () => {
    const items = [
      line("a", "d1", { productId: "tshirt", size: "M" }),
      line("b", "d2"),
    ];
    const next = setLineSize(items, "a", "L");
    expect(next.map((i) => [i.id, i.size])).toEqual([
      ["a", "L"],
      ["b", undefined],
    ]);
    expect(setLineSize(next, "a", "L")).toBe(next); // no change
    expect(setLineSize(next, "missing", "S")).toBe(next);
  });

  it("merges into a line that already has that design in that size", () => {
    const items = [
      line("a", "d1", { productId: "tshirt", size: "M", quantity: 2 }),
      line("b", "d1", { productId: "tshirt", size: "L", quantity: 9 }),
    ];
    const next = setLineSize(items, "a", "L");
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "b", size: "L", quantity: 10 }); // capped
  });

  it("never merges different designs or colours", () => {
    const items = [
      line("a", "d1", { productId: "tshirt", size: "M" }),
      line("b", "d2", { productId: "tshirt", size: "L" }),
      line("c", "d1", { productId: "tshirt", size: "L", colourId: "black" }),
    ];
    expect(setLineSize(items, "a", "L")).toHaveLength(3);
  });

  it("finds designs to upload once and orphaned snapshots", () => {
    const items = [
      line("a", "d1"),
      line("b", "d1", { size: "L" }),
      line("c", "d2"),
    ];
    expect(distinctDesigns(items).map((d) => d.designKey)).toEqual([
      "d1",
      "d2",
    ]);
    expect(orphanDesignKeys(items, ["d1", "d2", "d3"])).toEqual(["d3"]);
  });
});

describe("saved designs in localStorage", () => {
  const store = new Map<string, string>();
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  const doc = (assetId: string): DesignDocument => ({
    schemaVersion: 1,
    productId: "mug",
    units: "mm",
    printArea: { widthMm: 216, heightMm: 89, safeMarginMm: 5 },
    fabric: { objects: [{ type: "Image", src: `asset:${assetId}`, assetId }] },
  });

  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = fake;
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("keeps drafts and cart designs apart, and keeps photos of both", () => {
    saveDraft(doc("p-draft"));
    saveDraft(doc("p-cart"), "k1");
    saveThumbnail("k1", "data:image/webp;base64,AAAA");
    expect(loadDraft("mug")?.fabric).toEqual(doc("p-draft").fabric);
    expect(loadDraft("mug", "k1")?.fabric).toEqual(doc("p-cart").fabric);
    expect(savedDesignKeys()).toEqual(["k1"]);
    expect([...allDraftAssetIds()].sort()).toEqual(["p-cart", "p-draft"]);
    expect(loadThumbnail("k1")).toMatch(/^data:image\/webp/);

    deleteSavedDesign("k1");
    expect(loadDraft("mug", "k1")).toBeNull();
    expect(loadThumbnail("k1")).toBeNull();
    expect([...allDraftAssetIds()]).toEqual(["p-draft"]);
  });

  it("ignores thumbnails that aren't images", () => {
    saveThumbnail("k2", "javascript:alert(1)");
    expect(loadThumbnail("k2")).toBeNull();
  });
});
