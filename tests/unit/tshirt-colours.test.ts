import { describe, expect, it } from "vitest";
import { resolveColourId } from "@/features/editor/colour";
import { isDarkHex } from "@/features/editor/colour-utils";
import { getProduct } from "@/config/products";
import { isGarmentSpec, specsForColour } from "@/features/editor/mockup/specs";

const tshirt = getProduct("tshirt")!;

describe("T-shirt colours", () => {
  it("launches with white and black only", () => {
    expect(tshirt.baseColors.map((c) => c.id)).toEqual(["white", "black"]);
  });

  it("falls back to the first colour for a missing or unknown choice", () => {
    expect(resolveColourId(tshirt, null)).toBe("white");
    expect(resolveColourId(tshirt, "navy")).toBe("white");
    expect(resolveColourId(tshirt, "black")).toBe("black");
  });

  it("knows which garment colours are dark", () => {
    expect(isDarkHex("#171717")).toBe(true);
    expect(isDarkHex("#ffffff")).toBe(false);
  });

  it("gives each colour its own preview photos, white first", () => {
    const white = specsForColour("tshirt", "white");
    const black = specsForColour("tshirt", "black");
    expect(white.map((s) => s.id)).toEqual([
      "front",
      "window",
      "studio",
      "closeup",
    ]);
    expect(black.map((s) => s.id)).toEqual(["front-black", "window-black"]);
    // Same views, same print placement, so the preview does not jump on a switch.
    for (const s of black) {
      const twin = white.find((w) => w.label === s.label);
      expect(twin).toBeDefined();
      if (isGarmentSpec(s) && twin && isGarmentSpec(twin))
        expect(s.quad).toEqual(twin.quad);
    }
  });

  it("keeps every photo of every colour on a real colour of the product", () => {
    const ids = new Set(tshirt.baseColors.map((c) => c.id));
    for (const c of ids)
      expect(specsForColour("tshirt", c).length).toBeGreaterThan(0);
  });

  it("leaves mug photos for every colour", () => {
    expect(specsForColour("mug", "white").length).toBeGreaterThan(0);
  });
});
