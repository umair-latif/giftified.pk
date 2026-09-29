import { describe, expect, it } from "vitest";
import { mug } from "@/config/products/mug";
import {
  centreY,
  columnAngleDeg,
  curvedY,
  designXmm,
  printArcDeg,
  type WrapGeometry,
} from "@/features/editor/mockup/mapping";
import { MOCKUP_SPECS } from "@/features/editor/mockup/specs";

const geo: WrapGeometry = {
  wrapMm: mug.printArea.widthMm,
  diameterMm: 82,
};

describe("mockup mapping", () => {
  it("prints an arc smaller than the full circle for the mug wrap", () => {
    const arc = printArcDeg(geo);
    expect(arc).toBeGreaterThan(280);
    expect(arc).toBeLessThan(320);
  });

  it("maps photo columns to angles", () => {
    expect(columnAngleDeg(100, 100, 50)).toBeCloseTo(0);
    expect(columnAngleDeg(150, 100, 50)).toBeCloseTo(90);
    expect(columnAngleDeg(50, 100, 50)).toBeCloseTo(-90);
    expect(columnAngleDeg(500, 100, 50)).toBeCloseTo(90); // clamped
  });

  it("puts the design centre on the far silhouette (right view)", () => {
    expect(designXmm(-90, geo, "right")).toBeCloseTo(geo.wrapMm / 2);
  });

  it("leaves the handle gap unprinted and ends at the wrap edge", () => {
    expect(designXmm(90, geo, "right")).toBeNull();
    const edge = 90 - (360 - printArcDeg(geo)) / 2;
    expect(designXmm(edge - 0.01, geo, "right")).toBeCloseTo(geo.wrapMm, 0);
  });

  it("right shows the right half, left the left half", () => {
    for (let a = -90; a <= 55; a += 5) {
      const r = designXmm(a, geo, "right");
      const l = designXmm(a, geo, "left");
      if (r !== null) expect(r).toBeGreaterThanOrEqual(geo.wrapMm / 2 - 1e-6);
      if (l !== null) expect(l).toBeLessThanOrEqual(geo.wrapMm / 2 + 1e-6);
    }
  });

  it("increases left to right on the right view (text not mirrored)", () => {
    const a = designXmm(-60, geo, "right")!;
    const b = designXmm(0, geo, "right")!;
    expect(b).toBeGreaterThan(a);
    const c = designXmm(-60, geo, "left")!;
    const d = designXmm(0, geo, "left")!;
    expect(d).toBeGreaterThan(c);
  });

  it("has a mug mockup whose body sits inside the photo", () => {
    const s = MOCKUP_SPECS.mug!;
    expect(s.body.left).toBeGreaterThan(0);
    expect(s.body.right).toBeLessThan(s.widthPx);
    expect(s.body.bottom).toBeLessThan(s.heightPx);
    expect(s.printHeightMm).toBeLessThanOrEqual(mug.printArea.heightMm);
  });
});

describe("mockup vertical curve", () => {
  const c = { top: 80, bottom: 570, rimSag: -6, baseSag: 20 };

  it("leaves the centre of the mug unchanged", () => {
    expect(curvedY(300, 0, c)).toBeCloseTo(300);
  });

  it("raises the base line at the edges by the base sag", () => {
    expect(curvedY(570, 90, c)).toBeCloseTo(550);
    expect(curvedY(570, 60, c)).toBeCloseTo(560);
  });

  it("curves the rim the opposite way", () => {
    expect(curvedY(80, 90, c)).toBeCloseTo(86);
  });

  it("centreY inverts curvedY", () => {
    for (const yc of [100, 250, 400, 540]) {
      for (const a of [-80, -30, 0, 45, 85]) {
        expect(centreY(curvedY(yc, a, c), a, c)).toBeCloseTo(yc, 2);
      }
    }
  });
});
