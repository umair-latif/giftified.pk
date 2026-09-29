/**
 * Pure maths for wrapping a flat mug design around a photographed mug.
 *
 * Angles are degrees seen from the camera: 0 = facing the camera, ±90 = the
 * silhouette edges. The handle is at `handleAngleDeg` (default +90, the right
 * of the photo). The design (`wrapMm` wide, seam at the handle) is centred
 * opposite the handle, and ends `gap / 2` short of the handle.
 */

export interface WrapGeometry {
  /** Unrolled print width in mm (the mug's `printArea.widthMm`). */
  wrapMm: number;
  /** Outer diameter of the mug body in mm. */
  diameterMm: number;
  /**
   * Where the handle is, in degrees from the camera (90 = pure side view, the
   * default; smaller = the mug is turned so the handle faces the camera more).
   */
  handleAngleDeg?: number;
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
  const handle = geo.handleAngleDeg ?? 90;
  const x = geo.wrapMm / 2 + ((t - (handle - 180)) / arc) * geo.wrapMm;
  if (x > geo.wrapMm) return null;
  return side === "right" ? x : geo.wrapMm - x;
}

/**
 * The camera is not level with every horizontal circle of the mug, so a line
 * around it is drawn as a curve: at the centre it sits `sag` px lower than at
 * the silhouette edges (negative = higher, when the camera is below it).
 * `sag` varies linearly from the rim to the base of the body.
 */
export interface VerticalCurve {
  /** Front rim / base y at the photo centre (px). */
  top: number;
  bottom: number;
  /** Sag at the rim / at the base (px). */
  rimSag: number;
  baseSag: number;
}

/** Sag (px) of the horizontal line whose centre-of-mug y is `yc`. */
export function sagAt(yc: number, c: VerticalCurve): number {
  const f = Math.max(0, Math.min(1, (yc - c.top) / (c.bottom - c.top)));
  return c.rimSag + (c.baseSag - c.rimSag) * f;
}

/** Screen y of the line that is at `yc` on the mug's centre, seen at `angleDeg`. */
export function curvedY(
  yc: number,
  angleDeg: number,
  c: VerticalCurve,
): number {
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  return yc + sagAt(yc, c) * (cos - 1);
}

/** Inverse of `curvedY`: the centre-of-mug y for a screen row `y` at `angleDeg`. */
export function centreY(y: number, angleDeg: number, c: VerticalCurve): number {
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  let yc = y;
  for (let i = 0; i < 4; i++) yc = y - sagAt(yc, c) * (cos - 1);
  return yc;
}

/**
 * Top y (px, at the photo centre) of the print band. With `topMarginMm` it is
 * measured down from the rim; without it the band is centred on the body.
 */
export function printBandTop(
  body: { top: number; bottom: number },
  bandPx: number,
  pxPerMm: number,
  topMarginMm?: number,
): number {
  return topMarginMm === undefined
    ? (body.top + body.bottom) / 2 - bandPx / 2
    : body.top + topMarginMm * pxPerMm;
}

/** Screen px per mm on the mug's vertical axis, from the photographed body height. */
export function verticalPxPerMm(
  body: { top: number; bottom: number },
  mugHeightMm: number,
): number {
  return (body.bottom - body.top) / mugHeightMm;
}
