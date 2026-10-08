import { describe, expect, it } from "vitest";
import {
  formatCm,
  MM_PER_INCH,
  mmToPx,
  printPixelSize,
  pxToMm,
} from "@/lib/units";

describe("units", () => {
  it("converts one inch to exactly DPI pixels", () => {
    expect(mmToPx(MM_PER_INCH, 300)).toBe(300);
  });

  it("round-trips mm -> px -> mm", () => {
    expect(pxToMm(mmToPx(216, 300), 300)).toBeCloseTo(216, 10);
  });

  it("sizes the 11oz mug print file at 300 DPI", () => {
    expect(printPixelSize(216, 89, 300)).toEqual({ width: 2551, height: 1051 });
  });

  it("rejects invalid DPI", () => {
    expect(() => mmToPx(10, 0)).toThrow(RangeError);
    expect(() => pxToMm(10, Number.NaN)).toThrow(RangeError);
  });
});

describe("formatCm", () => {
  it("shows millimetres as centimetres for customers", () => {
    expect(formatCm(300)).toBe("30");
    expect(formatCm(228)).toBe("22.8");
    expect(formatCm(88.6)).toBe("8.9");
  });
});
