import { describe, expect, it } from "vitest";
import { POLAROID, polaroidFrame } from "@/features/editor/engine/polaroid";
import {
  FRAME_SHAPES,
  FRAME_SHAPE_INFO,
  buildFrameClip,
  isFrameShape,
} from "@/features/editor/engine/frame-shape";

/** Fake Path: bbox = the unit square, like the shapes' 0–100 boxes. */
class FakePath {
  width = 100;
  height = 100;
  scaleX = 1;
  scaleY = 1;
  constructor(
    public d: string,
    public options: Record<string, unknown>,
  ) {}
  set(props: Record<string, unknown>) {
    Object.assign(this, props);
  }
}

describe("frame shapes", () => {
  it("every shape is a closed path inside the 0–100 square", () => {
    for (const id of FRAME_SHAPES.filter((s) => s !== "polaroid")) {
      const { path } = FRAME_SHAPE_INFO[id];
      expect(path.startsWith("M")).toBe(true);
      expect(path.endsWith("Z")).toBe(true);
      const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
      // Arc flags are 0/1, so the range check holds for them too.
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });

  it("recognises only known ids", () => {
    expect(isFrameShape("heart")).toBe(true);
    expect(isFrameShape("polaroid")).toBe(true);
    expect(isFrameShape("hexagon")).toBe(false);
    expect(isFrameShape(undefined)).toBe(false);
  });

  it("stretches the shape over the photo's visible box, centred", () => {
    const clip = buildFrameClip(FakePath, "arch", 600, 800)!;
    expect(clip.d).toBe(FRAME_SHAPE_INFO.arch.path);
    expect(clip.scaleX).toBeCloseTo(6);
    expect(clip.scaleY).toBeCloseTo(8);
    expect(clip.options).toMatchObject({
      originX: "center",
      originY: "center",
      left: 0,
      top: 0,
    });
  });

  it("a polaroid is a border, not a clip", () => {
    expect(buildFrameClip(FakePath, "polaroid", 600, 600)).toBeNull();
  });

  it("returns null for no shape, unknown shape or an empty box", () => {
    expect(buildFrameClip(FakePath, undefined, 10, 10)).toBeNull();
    expect(buildFrameClip(FakePath, "nope", 10, 10)).toBeNull();
    expect(buildFrameClip(FakePath, "star", 0, 10)).toBeNull();
  });
});

describe("polaroid frame", () => {
  it("adds a thin border and a thicker bottom outside the photo box", () => {
    const f = polaroidFrame(1000, 800);
    expect(f.x).toBeCloseTo(-500 - 1000 * POLAROID.side);
    expect(f.y).toBeCloseTo(-400 - 1000 * POLAROID.top);
    expect(f.w).toBeCloseTo(1000 * (1 + 2 * POLAROID.side));
    // bottom band is wider than the top one
    const bottom = f.y + f.h - 400;
    const top = -400 - f.y;
    expect(bottom).toBeGreaterThan(top * 3);
  });
});
