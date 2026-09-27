import { describe, expect, it } from "vitest";
import { PRODUCTS, editableProductIds, getProduct } from "@/config/products";

describe("product config", () => {
  it("looks up known products and rejects unknown/prototype keys", () => {
    expect(getProduct("mug")?.id).toBe("mug");
    expect(getProduct("sofa")).toBeNull();
    expect(getProduct("toString")).toBeNull();
  });

  it.each(editableProductIds())("%s has a sane print area", (id) => {
    const p = PRODUCTS[id]!;
    const { widthMm, heightMm, safeMarginMm } = p.printArea;
    expect(p.id).toBe(id);
    expect(widthMm).toBeGreaterThan(0);
    expect(heightMm).toBeGreaterThan(0);
    expect(safeMarginMm).toBeGreaterThanOrEqual(0);
    expect(safeMarginMm * 2).toBeLessThan(Math.min(widthMm, heightMm));
    expect(p.printDpi).toBe(300);
    expect(p.baseColors.length).toBeGreaterThan(0);
  });
});
