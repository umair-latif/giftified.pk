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

describe("hoodie config (task 28)", () => {
  it("comes in white and grey, with the founder's 30 x 22 cm chest print", async () => {
    const { getProduct } = await import("@/config/products");
    const hoodie = getProduct("hoodie");
    const tee = getProduct("tshirt");
    expect(hoodie?.baseColors.map((c) => c.id)).toEqual(["white", "grey"]);
    expect(hoodie!.printArea).toMatchObject({ widthMm: 300, heightMm: 220 });
    expect(hoodie!.printArea.heightMm).toBeLessThan(tee!.printArea.heightMm);
    expect(hoodie?.vendorTodo).toBeTruthy();
  });
});

describe("hoodie photos", () => {
  it("place the editor canvas in the same shape as the print area", async () => {
    const { HOODIE_EDITOR_GUIDE } =
      await import("@/features/editor/mockup/garment-guide");
    const { getProduct } = await import("@/config/products");
    const { widthMm, heightMm } = getProduct("hoodie")!.printArea;
    // The marked box on the photo is 405 x 297 px: the print area's ratio.
    expect(405 / 297).toBeCloseTo(widthMm / heightMm, 2);
    expect(parseFloat(HOODIE_EDITOR_GUIDE.printWidth)).toBeCloseTo(
      (405 / 860) * 100,
      1,
    );
  });

  it("have a preview photo for every colour", async () => {
    const { specsForColour } = await import("@/features/editor/mockup/specs");
    expect(specsForColour("hoodie", "white").map((s) => s.id)).toEqual([
      "front",
      "studio",
    ]);
    expect(specsForColour("hoodie", "grey").map((s) => s.id)).toEqual([
      "front-grey",
    ]);
  });
});
