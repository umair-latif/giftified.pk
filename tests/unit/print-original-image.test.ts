import { describe, expect, it } from "vitest";
import { toOriginalGeometry } from "@/server/print/original-image";

describe("toOriginalGeometry (preview px → original px)", () => {
  it("scales crop and size up by k and scale down by k, per axis", () => {
    // 3000×1200 original, 1000×400 preview → k = 3 on both axes.
    const g = toOriginalGeometry({
      cropX: 250,
      cropY: 100,
      width: 500,
      height: 200,
      scaleX: 0.2,
      scaleY: 0.2,
      sourceWidthPx: 3000,
      sourceHeightPx: 1200,
      previewWidthPx: 1000,
      previewHeightPx: 400,
    });
    expect(g).toEqual({
      cropX: 750,
      cropY: 300,
      width: 1500,
      height: 600,
      scaleX: 0.2 / 3,
      scaleY: 0.2 / 3,
    });
    // Printed size is unchanged: width × scale.
    expect(g.width * g.scaleX).toBeCloseTo(100);
    expect(g.height * g.scaleY).toBeCloseTo(40);
  });

  it("uses heights for the y axis (rounded preview sizes)", () => {
    const g = toOriginalGeometry({
      width: 2048,
      height: 1365,
      scaleX: 0.05,
      scaleY: 0.05,
      sourceWidthPx: 4032,
      sourceHeightPx: 2688,
      previewWidthPx: 2048,
      previewHeightPx: 1365,
    });
    expect(g.width).toBe(4032);
    expect(g.height).toBe(2688);
    expect(g.width * g.scaleX).toBeCloseTo(2048 * 0.05);
    expect(g.height * g.scaleY).toBeCloseTo(1365 * 0.05);
  });

  it("without preview size, assumes the preview was the whole image", () => {
    const g = toOriginalGeometry({
      width: 1000,
      height: 500,
      scaleX: 0.1,
      scaleY: 0.1,
      sourceWidthPx: 4000,
      sourceHeightPx: 2000,
    });
    expect(g).toMatchObject({ cropX: 0, cropY: 0, width: 4000, height: 2000 });
    expect(g.scaleX).toBeCloseTo(0.025);
  });

  it("is a no-op when the preview was the original (small photos)", () => {
    const saved = {
      cropX: 10,
      cropY: 20,
      width: 300,
      height: 200,
      scaleX: 0.3,
      scaleY: 0.3,
      sourceWidthPx: 800,
      sourceHeightPx: 600,
      previewWidthPx: 800,
      previewHeightPx: 600,
    };
    expect(toOriginalGeometry(saved)).toEqual({
      cropX: 10,
      cropY: 20,
      width: 300,
      height: 200,
      scaleX: 0.3,
      scaleY: 0.3,
    });
  });

  it("prefers the decoded original size when given", () => {
    const g = toOriginalGeometry(
      { width: 100, height: 100, previewWidthPx: 100, previewHeightPx: 100 },
      { width: 400, height: 200 },
    );
    expect(g).toMatchObject({ width: 400, height: 200, scaleX: 0.25 });
  });

  it("rejects objects without the sizes it needs", () => {
    expect(() => toOriginalGeometry({ width: 100, height: 100 })).toThrow(
      /sourceWidthPx/,
    );
  });
});
