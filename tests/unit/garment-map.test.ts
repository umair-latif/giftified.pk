import { describe, expect, it } from "vitest";
import {
  edgeOffset,
  makeGarmentMap,
} from "@/features/editor/mockup/garment-map";
import { PARKED_TSHIRT_SPECS } from "@/features/editor/mockup/specs";

const specs = PARKED_TSHIRT_SPECS;

describe("garment map", () => {
  it("has the model photo with curved edges", () => {
    const model = specs.find((s) => s.id === "model");
    expect(model?.edges?.top?.length).toBeGreaterThan(8);
    expect(model?.quad.br).toBeDefined();
  });

  it("round-trips print coordinates through the photo, with perspective and bow", () => {
    for (const spec of specs) {
      const map = makeGarmentMap(spec);
      for (const [u, v] of [
        [0.1, 0.1],
        [0.5, 0.5],
        [0.9, 0.2],
        [0.3, 0.95],
      ] as const) {
        const [x, y] = map.forward(u, v);
        const [u2, v2] = map.inverse(x, y);
        expect(u2).toBeCloseTo(u, 4);
        expect(v2).toBeCloseTo(v, 4);
      }
    }
  });

  it("puts the corners where the quad says", () => {
    for (const spec of specs) {
      const map = makeGarmentMap(spec);
      const [x, y] = map.forward(0, 0);
      expect(x).toBeCloseTo(spec.quad.tl[0], 6);
      expect(y).toBeCloseTo(spec.quad.tl[1], 6);
      const [rx, ry] = map.forward(1, 0);
      expect(rx).toBeCloseTo(spec.quad.tr[0], 6);
      expect(ry).toBeCloseTo(spec.quad.tr[1], 6);
    }
  });

  it("follows the measured edge offsets", () => {
    const model = specs.find((s) => s.id === "model")!;
    const map = makeGarmentMap(model);
    const top = model.edges!.top!;
    // Halfway along the top edge: the straight line plus the sampled offset.
    const [, yMid] = map.forward(0.5, 0);
    const straight = (model.quad.tl[1] + model.quad.tr[1]) / 2;
    expect(yMid - straight).toBeCloseTo(edgeOffset(top, 0.5), 6);
    // The samples themselves are hit exactly.
    const [, y3] = map.forward(3 / (top.length - 1), 0);
    const line =
      model.quad.tl[1] +
      (3 / (top.length - 1)) * (model.quad.tr[1] - model.quad.tl[1]);
    expect(y3 - line).toBeCloseTo(top[3]!, 6);
  });
});
