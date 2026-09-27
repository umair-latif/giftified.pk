import { describe, expect, it } from "vitest";
import {
  dpiStatus,
  effectiveDpi,
  effectiveDpi2D,
  maxPrintWidthMm,
} from "@/lib/dpi";

describe("effective DPI", () => {
  it("is pixels per printed inch", () => {
    // 2000px printed 254mm (10in) wide = 200 DPI
    expect(effectiveDpi(2000, 254)).toBeCloseTo(200, 10);
  });

  it("drops as the image is scaled up on the print area", () => {
    expect(effectiveDpi(2000, 508)).toBeCloseTo(100, 10);
  });

  it("uses the worst axis", () => {
    const dpi = effectiveDpi2D(
      { widthPx: 3000, heightPx: 1000 },
      { widthMm: 254, heightMm: 254 },
    );
    expect(dpi).toBeCloseTo(100, 10);
  });

  it("handles degenerate input", () => {
    expect(effectiveDpi(1000, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(effectiveDpi(0, 100)).toBe(0);
  });

  it("classifies against 200 warn / 150 block", () => {
    expect(dpiStatus(300)).toBe("ok");
    expect(dpiStatus(200)).toBe("ok");
    expect(dpiStatus(199.9)).toBe("warn");
    expect(dpiStatus(150)).toBe("warn");
    expect(dpiStatus(149.9)).toBe("block");
  });

  it("computes the widest print that still meets the minimum", () => {
    expect(maxPrintWidthMm(2000, 200)).toBeCloseTo(254, 10);
  });
});
