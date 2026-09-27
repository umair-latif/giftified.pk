import type { PrintArea } from "@/config/products";

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Keeps an object's centre inside the print area so it can never be dragged
 * fully off the printable surface. Pure so it is unit-testable without Fabric.
 */
export function clampCenterToArea(center: Vec2, area: PrintArea): Vec2 {
  return {
    x: clamp(center.x, 0, area.widthMm),
    y: clamp(center.y, 0, area.heightMm),
  };
}

/** Limits for pinch scaling, expressed as the object's printed width in mm. */
export const MIN_OBJECT_WIDTH_MM = 5;

export function clampScaleRatio(
  ratio: number,
  startWidthMm: number,
  area: PrintArea,
): number {
  if (!(startWidthMm > 0) || !Number.isFinite(ratio)) return 1;
  const min = MIN_OBJECT_WIDTH_MM / startWidthMm;
  const max = (area.widthMm * 3) / startWidthMm;
  return clamp(ratio, min, max);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
