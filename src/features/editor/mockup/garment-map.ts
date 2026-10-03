import type { GarmentMockupSpec, Point } from "./specs";

/**
 * Print-area coordinates (u, v in 0..1, from the top-left) <-> photo pixels
 * for a garment photo: a bilinear patch through the four corners plus a
 * parabolic bow on each edge, so the print can follow perspective and cloth.
 */
export interface GarmentMap {
  /** Photo position of print coordinate (u, v). */
  forward(u: number, v: number): [number, number];
  /** Print coordinate under a photo pixel (Newton iteration). */
  inverse(x: number, y: number): [number, number];
  /** Photo bounds of the print: [minX, minY, maxX, maxY]. */
  bounds: [number, number, number, number];
  /** Approximate print size on the photo, px. */
  size: [number, number];
}

/** Catmull-Rom through evenly spaced samples; t in 0..1; no samples = 0. */
export function edgeOffset(
  samples: readonly number[] | undefined,
  t: number,
): number {
  if (!samples || samples.length === 0) return 0;
  const n = samples.length - 1;
  if (n === 0) return samples[0]!;
  const x = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = samples[Math.max(i - 1, 0)]!;
  const p1 = samples[i]!;
  const p2 = samples[i + 1]!;
  const p3 = samples[Math.min(i + 2, n)]!;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * f +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f)
  );
}

export function makeGarmentMap(spec: GarmentMockupSpec): GarmentMap {
  const { tl, tr, bl } = spec.quad;
  const br: Point = spec.quad.br ?? [
    tr[0] + bl[0] - tl[0],
    tr[1] + bl[1] - tl[1],
  ];
  const T = (t: number) => edgeOffset(spec.edges?.top, t);
  const B = (t: number) => edgeOffset(spec.edges?.bottom, t);
  const L = (t: number) => edgeOffset(spec.edges?.left, t);
  const R = (t: number) => edgeOffset(spec.edges?.right, t);
  const d = (f: (t: number) => number, t: number) =>
    (f(Math.min(1, t + 1e-3)) - f(Math.max(0, t - 1e-3))) /
    (Math.min(1, t + 1e-3) - Math.max(0, t - 1e-3));

  const forward = (u: number, v: number): [number, number] => [
    (1 - u) * (1 - v) * tl[0] +
      u * (1 - v) * tr[0] +
      (1 - u) * v * bl[0] +
      u * v * br[0] +
      L(v) * (1 - u) +
      R(v) * u,
    (1 - u) * (1 - v) * tl[1] +
      u * (1 - v) * tr[1] +
      (1 - u) * v * bl[1] +
      u * v * br[1] +
      T(u) * (1 - v) +
      B(u) * v,
  ];

  // Start from the parallelogram through tl, tr, bl.
  const ex = [tr[0] - tl[0], tr[1] - tl[1]] as const;
  const ey = [bl[0] - tl[0], bl[1] - tl[1]] as const;
  const det0 = ex[0] * ey[1] - ex[1] * ey[0];
  if (Math.abs(det0) < 1e-6) throw new Error("Bad garment quad");

  const inverse = (x: number, y: number): [number, number] => {
    let u = ((x - tl[0]) * ey[1] - (y - tl[1]) * ey[0]) / det0;
    let v = (ex[0] * (y - tl[1]) - ex[1] * (x - tl[0])) / det0;
    for (let k = 0; k < 4; k++) {
      const [fx, fy] = forward(u, v);
      const rx = x - fx;
      const ry = y - fy;
      if (rx * rx + ry * ry < 1e-6) break;
      const dxdu =
        (1 - v) * (tr[0] - tl[0]) + v * (br[0] - bl[0]) + R(v) - L(v);
      const dxdv =
        (1 - u) * (bl[0] - tl[0]) +
        u * (br[0] - tr[0]) +
        d(L, v) * (1 - u) +
        d(R, v) * u;
      const dydu =
        (1 - v) * (tr[1] - tl[1]) +
        v * (br[1] - bl[1]) +
        d(T, u) * (1 - v) +
        d(B, u) * v;
      const dydv =
        (1 - u) * (bl[1] - tl[1]) + u * (br[1] - tr[1]) + B(u) - T(u);
      const det = dxdu * dydv - dxdv * dydu;
      if (Math.abs(det) < 1e-9) break;
      u += (rx * dydv - ry * dxdv) / det;
      v += (ry * dxdu - rx * dydu) / det;
    }
    return [u, v];
  };

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= 8; i++) {
    for (const [u, v] of [
      [i / 8, 0],
      [i / 8, 1],
      [0, i / 8],
      [1, i / 8],
    ] as const) {
      const [x, y] = forward(u, v);
      xs.push(x);
      ys.push(y);
    }
  }
  return {
    forward,
    inverse,
    bounds: [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ],
    size: [
      (Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) +
        Math.hypot(br[0] - bl[0], br[1] - bl[1])) /
        2,
      (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) +
        Math.hypot(br[0] - tr[0], br[1] - tr[1])) /
        2,
    ],
  };
}
