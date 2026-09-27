/**
 * Crop maths for the crop screen. Pure (no Fabric), unit-tested.
 *
 * A crop is a rectangle in NORMALISED image coordinates (0–1 of the full image),
 * so it means the same thing for the small preview and the original upload.
 */
export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropView {
  /** Width ÷ height of the crop frame. */
  frameAspect: number;
  /** 1 = the image just covers the frame; larger = zoomed in. */
  zoom: number;
  /** Centre of the visible area, normalised. */
  center: { x: number; y: number };
}

export const MAX_CROP_ZOOM = 5;
export const FULL_RECT: NormRect = { x: 0, y: 0, w: 1, h: 1 };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Visible size (normalised) when the image just covers a frame of `frameAspect`. */
function coverSize(imageAspect: number, frameAspect: number) {
  return imageAspect > frameAspect
    ? { w: frameAspect / imageAspect, h: 1 } // image wider than frame: trim the sides
    : { w: 1, h: imageAspect / frameAspect }; // image taller: trim top/bottom
}

/** The normalised crop rectangle shown by a view (centre is clamped so the frame stays filled). */
export function viewToRect(imageAspect: number, view: CropView): NormRect {
  const zoom = clamp(view.zoom, 1, MAX_CROP_ZOOM);
  const base = coverSize(imageAspect, view.frameAspect);
  const w = base.w / zoom;
  const h = base.h / zoom;
  const cx = clamp(view.center.x, w / 2, 1 - w / 2);
  const cy = clamp(view.center.y, h / 2, 1 - h / 2);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Inverse of `viewToRect`: reopen the crop screen on an existing crop. */
export function rectToView(imageAspect: number, rect: NormRect): CropView {
  const frameAspect = (rect.w * imageAspect) / rect.h;
  const base = coverSize(imageAspect, frameAspect);
  return {
    frameAspect,
    zoom: clamp(base.w / rect.w, 1, MAX_CROP_ZOOM),
    center: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
  };
}

/** Move the view by a drag of (dx, dy) screen pixels on a frame `framePxWidth` wide. */
export function panView(
  imageAspect: number,
  view: CropView,
  dx: number,
  dy: number,
  framePxWidth: number,
): CropView {
  const r = viewToRect(imageAspect, view);
  const framePxHeight = framePxWidth / view.frameAspect;
  // Dragging the photo right reveals more of its left side.
  const next = {
    ...view,
    center: {
      x: r.x + r.w / 2 - (dx * r.w) / framePxWidth,
      y: r.y + r.h / 2 - (dy * r.h) / framePxHeight,
    },
  };
  const clamped = viewToRect(imageAspect, next);
  return {
    ...next,
    center: { x: clamped.x + clamped.w / 2, y: clamped.y + clamped.h / 2 },
  };
}

export function rectsEqual(a: NormRect, b: NormRect, eps = 1e-6): boolean {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.w - b.w) < eps &&
    Math.abs(a.h - b.h) < eps
  );
}
