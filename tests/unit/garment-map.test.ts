import { describe, expect, it } from "vitest";
import { makeGarmentMap } from "@/features/editor/mockup/garment-map";
import { isGarmentSpec, MOCKUP_SPECS } from "@/features/editor/mockup/specs";

const specs = (MOCKUP_SPECS.tshirt ?? []).filter(isGarmentSpec);

describe("garment map", () => {
  it("has the model photo with curved edges", () => {
    const model = specs.find((s) => s.id === "model");
    expect(model?.bow?.top).toBeLessThan(0);
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

  it("bows the top edge by the given px at its middle", () => {
    const model = specs.find((s) => s.id === "model")!;
    const map = makeGarmentMap(model);
    const [, yMid] = map.forward(0.5, 0);
    const straight = (model.quad.tl[1] + model.quad.tr[1]) / 2;
    expect(yMid - straight).toBeCloseTo(model.bow?.top ?? 0, 6);
  });
});
