import { describe, expect, it } from "vitest";
import { mug } from "@/config/products/mug";
import {
  centreY,
  columnAngleDeg,
  lineY,
  outlineBand,
  curvedY,
  designXmm,
  printArcDeg,
  sagAt,
  printBandTop,
  verticalPxPerMm,
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

  it("has mug mockups whose body sits inside their photo, with unique ids", () => {
    const specs = MOCKUP_SPECS.mug!;
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
    for (const s of specs) {
      expect(s.body.left).toBeGreaterThan(0);
      expect(s.body.right).toBeLessThan(s.widthPx);
      expect(s.body.top).toBeLessThan(s.body.bottom);
      expect(s.body.bottom).toBeLessThan(s.heightPx);
    }
  });

  it("turning the mug (handle nearer the camera) shows more of the wrap", () => {
    const turned = { ...geo, handleAngleDeg: 64 };
    // Same photo column, the design position moves by the rotation.
    const side = designXmm(0, geo, "right")!;
    const rot = designXmm(0, turned, "right")!;
    expect(rot).toBeGreaterThan(side);
    expect(designXmm(64, turned, "right")).toBeNull(); // handle gap
    expect(designXmm(-90, turned, "right")!).toBeGreaterThan(
      geo.wrapMm / 2 - 1e-6,
    );
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

describe("print band position", () => {
  const body = { top: 100, bottom: 600 };

  it("centres the band on the body by default", () => {
    expect(printBandTop(body, 400, 5)).toBeCloseTo(150);
  });

  it("measures from the rim when the vendor gives a margin", () => {
    expect(printBandTop(body, 400, 5, 8)).toBeCloseTo(140);
  });

  it("sizes the band against the mug height, not the diameter", () => {
    const s = MOCKUP_SPECS.mug![0]!;
    const pxPerMm = verticalPxPerMm(s.body, s.mugHeightMm);
    const bandPx = mug.printArea.heightMm * pxPerMm;
    const bodyPx = s.body.bottom - s.body.top;
    expect(bandPx).toBeLessThan(bodyPx);
    expect(bandPx / bodyPx).toBeCloseTo(mug.printArea.heightMm / s.mugHeightMm);
  });
});

describe("mockup tilt", () => {
  const c = { top: 80, bottom: 570, rimSag: -6, baseSag: 20, tilt: -4 };

  it("shifts the right side up/down and the left the other way", () => {
    expect(curvedY(300, 90, c)).toBeCloseTo(300 - 4 + sagAt(300, c) * -1);
    expect(curvedY(300, -90, c)).toBeCloseTo(300 + 4 + sagAt(300, c) * -1);
  });

  it("centreY still inverts curvedY with a tilt", () => {
    for (const yc of [100, 300, 540]) {
      for (const a of [-80, -30, 0, 45, 85]) {
        expect(centreY(curvedY(yc, a, c), a, c)).toBeCloseTo(yc, 2);
      }
    }
  });
});

describe("mockup outline", () => {
  const outline = {
    top: [
      [100, 50],
      [200, 40],
      [300, 40],
    ] as const,
    bottom: [
      [100, 250],
      [300, 230],
    ] as const,
  };

  it("interpolates a polyline and clamps beyond its ends", () => {
    expect(lineY(outline.top, 150)).toBeCloseTo(45);
    expect(lineY(outline.top, 250)).toBeCloseTo(40);
    expect(lineY(outline.top, 0)).toBeCloseTo(50);
    expect(lineY(outline.top, 999)).toBeCloseTo(40);
  });

  it("places the print band between the measured top and base edges", () => {
    // Whole mug height at x=200: 40..240 (base interpolates to 240 there).
    const band = outlineBand(outline, 200, 0.1, 0.9);
    expect(band.top).toBeCloseTo(40 + 0.1 * 200);
    expect(band.bottom).toBeCloseTo(40 + 0.9 * 200);
  });

  it("the flat-lay mockup has ordered outlines inside its photo", () => {
    const flat = MOCKUP_SPECS.mug!.find((s) => s.id === "flatlay")!;
    for (const line of [flat.outline!.top, flat.outline!.bottom]) {
      for (let i = 1; i < line.length; i++) {
        expect(line[i]![0]).toBeGreaterThan(line[i - 1]![0]);
      }
      for (const [x, y] of line) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(flat.widthPx);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(flat.heightPx);
      }
    }
  });
});
