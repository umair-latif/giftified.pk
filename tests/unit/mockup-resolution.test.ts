import { describe, expect, it } from "vitest";
import { mug } from "@/config/products/mug";
import {
  MAX_RENDER_PIXELS,
  MOCKUP_PX_PER_MM,
  previewRenderWidth,
} from "@/features/editor/mockup/resolution";

describe("preview render size", () => {
  const area = mug.printArea;

  it("draws a mug at 8 px/mm even on a 1x desktop screen", () => {
    expect(previewRenderWidth(area, 448)).toBe(
      Math.round(area.widthMm * MOCKUP_PX_PER_MM),
    );
  });

  it("never goes below what the screen shows", () => {
    expect(previewRenderWidth(area, 4000)).toBe(4000);
  });

  it("stays under the pixel cap for tall print areas", () => {
    const tall = { widthMm: 300, heightMm: 400, safeMarginMm: 10 };
    const w = previewRenderWidth(tall, 1080);
    const h = (w * tall.heightMm) / tall.widthMm;
    expect(w * h).toBeLessThanOrEqual(MAX_RENDER_PIXELS * 1.001);
    expect(w).toBeGreaterThanOrEqual(1080);
  });
});
