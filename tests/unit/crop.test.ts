import { describe, expect, it } from "vitest";
import {
  FULL_RECT,
  MAX_CROP_ZOOM,
  panView,
  rectToView,
  rectsEqual,
  viewToRect,
} from "@/features/editor/engine/crop";

const wide = 3000 / 1200; // 2.5:1 photo

describe("crop maths", () => {
  it("original aspect at zoom 1 is the whole image", () => {
    expect(
      viewToRect(wide, {
        frameAspect: wide,
        zoom: 1,
        center: { x: 0.5, y: 0.5 },
      }),
    ).toEqual(FULL_RECT);
  });

  it("a square frame on a wide photo keeps full height and trims the sides", () => {
    const r = viewToRect(wide, {
      frameAspect: 1,
      zoom: 1,
      center: { x: 0.5, y: 0.5 },
    });
    expect(r.h).toBeCloseTo(1);
    expect(r.w).toBeCloseTo(1 / 2.5);
    expect(r.x).toBeCloseTo(0.3);
    // In real pixels the crop is square: w*3000 == h*1200
    expect(r.w * 3000).toBeCloseTo(r.h * 1200);
  });

  it("a wide frame on a tall photo keeps full width", () => {
    const tall = 3 / 4;
    const r = viewToRect(tall, {
      frameAspect: 16 / 9,
      zoom: 1,
      center: { x: 0.5, y: 0.5 },
    });
    expect(r.w).toBeCloseTo(1);
    expect(r.h).toBeCloseTo(tall / (16 / 9));
  });

  it("zoom shrinks the visible area and is clamped", () => {
    const r = viewToRect(wide, {
      frameAspect: wide,
      zoom: 2,
      center: { x: 0.5, y: 0.5 },
    });
    expect(r).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
    const max = viewToRect(wide, {
      frameAspect: wide,
      zoom: 99,
      center: { x: 0.5, y: 0.5 },
    });
    expect(max.w).toBeCloseTo(1 / MAX_CROP_ZOOM);
    const min = viewToRect(wide, {
      frameAspect: wide,
      zoom: 0.2,
      center: { x: 0.5, y: 0.5 },
    });
    expect(min).toEqual(FULL_RECT);
  });

  it("keeps the frame filled: the centre can't move past the edges", () => {
    const r = viewToRect(wide, {
      frameAspect: wide,
      zoom: 2,
      center: { x: 0, y: 1 },
    });
    expect(r.x).toBeCloseTo(0);
    expect(r.y + r.h).toBeCloseTo(1);
  });

  it("round-trips rect -> view -> rect", () => {
    const rect = { x: 0.1, y: 0.2, w: 0.4, h: 0.5 };
    expect(rectsEqual(viewToRect(wide, rectToView(wide, rect)), rect)).toBe(
      true,
    );
  });

  it("dragging the photo right shows more of its left side", () => {
    const start = { frameAspect: wide, zoom: 2, center: { x: 0.5, y: 0.5 } };
    const moved = panView(wide, start, 100, 0, 200); // drag 100 px on a 200 px frame
    // Visible width is 0.5 of the image, so 100 px = half of it = 0.25
    expect(moved.center.x).toBeCloseTo(0.25);
    expect(moved.center.y).toBeCloseTo(0.5);
    const far = panView(wide, start, 10_000, 0, 200);
    expect(far.center.x).toBeCloseTo(0.25); // clamped at the left edge
  });
});
