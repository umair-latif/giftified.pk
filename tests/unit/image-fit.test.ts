import { describe, expect, it } from "vitest";
import { mug } from "@/config/products/mug";
import { initialImageWidthMm } from "@/features/editor/engine/image-fit";
import { effectiveDpi } from "@/lib/dpi";

const area = mug.printArea; // 216 x 89 mm, 5 mm safe margin

describe("initial image size", () => {
  it("fits a large photo inside the safe zone", () => {
    const w = initialImageWidthMm({ widthPx: 4000, heightPx: 3000 }, area);
    const h = w * (3000 / 4000);
    expect(h).toBeCloseTo((89 - 10) * 0.9, 5); // height-limited
    expect(effectiveDpi(4000, w)).toBeGreaterThan(200);
  });

  it("caps a small photo at the size where it still prints at 200 DPI", () => {
    const w = initialImageWidthMm({ widthPx: 600, heightPx: 400 }, area);
    expect(effectiveDpi(600, w)).toBeCloseTo(200, 5);
  });

  it("keeps tiny images visible even though they print soft", () => {
    const w = initialImageWidthMm({ widthPx: 80, heightPx: 80 }, area);
    expect(w).toBe(20);
  });
});
