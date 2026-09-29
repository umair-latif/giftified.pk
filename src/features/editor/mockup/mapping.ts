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
  /**
   * The photo may be tilted or shot off-centre, so one side of every horizontal
   * line sits higher than the other: px added at the right silhouette (and
   * subtracted at the left). Default 0.
   */
  tilt?: number;
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
  const rad = (angleDeg * Math.PI) / 180;
  return (
    yc + sagAt(yc, c) * (Math.cos(rad) - 1) + (c.tilt ?? 0) * Math.sin(rad)
  );
}

/** Inverse of `curvedY`: the centre-of-mug y for a screen row `y` at `angleDeg`. */
export function centreY(y: number, angleDeg: number, c: VerticalCurve): number {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const tilt = (c.tilt ?? 0) * Math.sin(rad);
  let yc = y;
  for (let i = 0; i < 4; i++) yc = y - sagAt(yc, c) * (cos - 1) - tilt;
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

/** A point on the photo, in the photo's own pixels. */
export type Point = readonly [x: number, y: number];

/**
 * The mug's measured top and base edges (left to right). When a photo gives
 * them, the print band is placed between them column by column, so it follows
 * whatever shape the mug really has (tilt, rounded corners, an off-centre
 * camera) instead of a fitted curve.
 */
export interface Outline {
  top: readonly Point[];
  bottom: readonly Point[];
}

/** y of a left-to-right polyline at `x` (linear between points, flat beyond the ends). */
export function lineY(points: readonly Point[], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  let i = 1;
  while (i < points.length - 1 && points[i]![0] < x) i++;
  const a = points[i - 1]!;
  const b = points[i]!;
  const t = (x - a[0]) / (b[0] - a[0] || 1);
  return a[1] + (b[1] - a[1]) * t;
}

/**
 * Screen y of the print band's top and bottom edges in column `x`: the band
 * occupies the fraction `vTop..vBot` of the mug's height between its measured
 * top and base edges.
 */
export function outlineBand(
  outline: Outline,
  x: number,
  vTop: number,
  vBot: number,
): { top: number; bottom: number } {
  const t = lineY(outline.top, x);
  const b = lineY(outline.bottom, x);
  return { top: t + vTop * (b - t), bottom: t + vBot * (b - t) };
}
