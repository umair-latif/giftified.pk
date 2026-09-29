/**
 * Pure maths for wrapping a flat mug design around a photographed mug.
 *
 * Angles are degrees seen from the camera: 0 = facing the camera, ±90 = the
 * silhouette edges. The handle is at +90 (right of the photo). The design
 * (`wrapMm` wide, seam at the handle) is centred opposite the handle, so its
 * centre sits at -90 and it ends `gap / 2` short of the handle at +90.
 */

export interface WrapGeometry {
  /** Unrolled print width in mm (the mug's `printArea.widthMm`). */
  wrapMm: number;
  /** Outer diameter of the mug body in mm. */
  diameterMm: number;
}

export type MockupSide = "right" | "left";

/** Angle of the mug's circumference the print covers (capped at 360). */
export function printArcDeg({ wrapMm, diameterMm }: WrapGeometry): number {
  return Math.min(360, (wrapMm / (Math.PI * diameterMm)) * 360);
}

/** Angle (deg) of a photo column on a cylinder centred at `cx` with radius `r` px. */
export function columnAngleDeg(px: number, cx: number, r: number): number {
  const u = Math.max(-1, Math.min(1, (px - cx) / r));
  return (Math.asin(u) * 180) / Math.PI;
}

/**
 * Where on the flat design (mm from its left edge) a point at `angleDeg` is
 * printed, or null in the unprinted handle gap. `side: "left"` is the mirrored
 * photo (handle on the left) and shows the other half of the design.
 */
export function designXmm(
  angleDeg: number,
  geo: WrapGeometry,
  side: MockupSide,
): number | null {
  const arc = printArcDeg(geo);
  // Right view: handle at +90. Left view is the mirror image (handle at -90).
  const t = side === "right" ? angleDeg : -angleDeg;
  const x = geo.wrapMm / 2 + ((t + 90) / arc) * geo.wrapMm;
  if (x > geo.wrapMm) return null;
  return side === "right" ? x : geo.wrapMm - x;
}
