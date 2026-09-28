import { describe, expect, it } from "vitest";
import { initialImageWidthMm } from "@/features/editor/engine/image-fit";
import { effectiveDpi } from "@/lib/dpi";

// A fixed example area (not the live mug config, which may change with vendor specs).
const area = { widthMm: 216, heightMm: 89, safeMarginMm: 5 };

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
