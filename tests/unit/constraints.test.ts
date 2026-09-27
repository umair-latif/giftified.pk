import { describe, expect, it } from "vitest";
import {
  MIN_OBJECT_WIDTH_MM,
  clampCenterToArea,
  clampScaleRatio,
} from "@/features/editor/engine/constraints";

const area = { widthMm: 216, heightMm: 89, safeMarginMm: 5 };

describe("editor constraints", () => {
  it("leaves centres inside the print area alone", () => {
    expect(clampCenterToArea({ x: 100, y: 40 }, area)).toEqual({
      x: 100,
      y: 40,
    });
  });

  it("pulls centres back onto the print area", () => {
    expect(clampCenterToArea({ x: -30, y: 500 }, area)).toEqual({
      x: 0,
      y: 89,
    });
  });

  it("limits pinch scaling to a min width and 3x the print width", () => {
    expect(clampScaleRatio(0.01, 100, area) * 100).toBeCloseTo(
      MIN_OBJECT_WIDTH_MM,
    );
    expect(clampScaleRatio(100, 100, area) * 100).toBeCloseTo(216 * 3);
    expect(clampScaleRatio(1.5, 100, area)).toBe(1.5);
    expect(clampScaleRatio(Number.NaN, 100, area)).toBe(1);
  });
});
