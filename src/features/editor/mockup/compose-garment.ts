import { makeGarmentMap } from "./garment-map";
import type { GarmentMockupSpec, InkSettings } from "./specs";

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

/**
 * How the ink sits on the cloth. Tuned by eye against printed samples; change
 * here only (see docs/ops/mockup-assets.md).
 */
export const INK: InkSettings = {
  /** Broad shadows (folds, body curve) darken the ink this much more than 1:1. */
  shadow: 1,
  /** Fabric grain (threads) shows through the ink this much more than 1:1. */
  grain: 1,
  /** Ink opacity: below 1 the cloth colour shows through a little (faded look). */
  opacity: 0.98,
  /** Where the cloth is bright (thread ridges) the ink gets thinner by up to this share. */
  ridgeDropout: 0.1,
  /**
   * Fabric weave added to the ink on top of the photo's own grain: std of the
   * brightness ratio (the photo is often smooth where the print sits).
   */
  weave: 0.015,
  /** px the ink follows the folds (the shading is used as a height map). */
  warp: 2.5,
};

/** Deterministic hash -> [0, 1). */
function hash(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise at one scale (px per cell). */
function valueNoise(x: number, y: number, cell: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/** Fine mottled fabric weave, roughly zero-mean with unit spread. */
function fabricNoise(x: number, y: number): number {
  const n = 0.85 * valueNoise(x, y, 1.7) + 0.15 * valueNoise(x + 91, y + 37, 3.6);
  return (n - 0.5) * 4.2;
}

/** Separable box blur with clamped edges (3 passes ≈ Gaussian). */
function blur(src: Float32Array, w: number, h: number, sigma: number) {
  const r = Math.max(1, Math.round(sigma * 0.9));
  let a = src;
  let b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++)
        sum += a[row + Math.min(w - 1, Math.max(0, x))]!;
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / (2 * r + 1);
        sum +=
          a[row + Math.min(w - 1, x + r + 1)]! - a[row + Math.max(0, x - r)]!;
      }
    }
    // vertical
    const c = new Float32Array(src.length);
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++)
        sum += b[Math.min(h - 1, Math.max(0, y)) * w + x]!;
      for (let y = 0; y < h; y++) {
        c[y * w + x] = sum / (2 * r + 1);
        sum +=
          b[Math.min(h - 1, y + r + 1) * w + x]! -
          b[Math.max(0, y - r) * w + x]!;
      }
    }
    a = c;
    b = new Float32Array(src.length);
  }
  return a;
}

/**
 * Lays a rendered design (transparent PNG data URL of the whole print area)
 * on a garment photo, so it looks printed on the cloth rather than pasted on:
 * the print rectangle is mapped through `spec.quad` (affine, so tilted shirts
 * work); the photo is split into broad shading (folds, shadows) and fine
 * fabric grain, both multiplied into the ink; the ink is slightly faded and
 * thinner on thread ridges; and it follows the folds by a couple of pixels.
 * Returns a WebP/JPEG data URL at the photo's size.
 */
export async function composeGarmentMockup(
  designSrc: string,
  spec: GarmentMockupSpec,
): Promise<string> {
  const ink: InkSettings = { ...INK, ...spec.ink };
  const [photo, design] = await Promise.all([
    loadImage(spec.src),
    loadImage(designSrc),
  ]);
  const { widthPx: W, heightPx: H } = spec;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(photo, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const px = img.data;

  const dw = design.naturalWidth;
  const dh = design.naturalHeight;
  const dc = document.createElement("canvas");
  dc.width = dw;
  dc.height = dh;
  const dctx = dc.getContext("2d", { willReadFrequently: true });
  if (!dctx) throw new Error("Canvas not available");
  dctx.drawImage(design, 0, 0);
  const dd = dctx.getImageData(0, 0, dw, dh).data;

  // Exact outline (sharp corners, folds) when the spec has one.
  let maskData: Uint8ClampedArray | null = null;
  if (spec.mask) {
    const m = await loadImage(spec.mask);
    const mc = document.createElement("canvas");
    mc.width = W;
    mc.height = H;
    const mctx = mc.getContext("2d", { willReadFrequently: true });
    if (!mctx) throw new Error("Canvas not available");
    mctx.drawImage(m, 0, 0, W, H);
    maskData = mctx.getImageData(0, 0, W, H).data;
  }

  const map = makeGarmentMap(spec);
  const [bx0, by0, bx1, by1] = map.bounds;
  // Work area: the print plus a margin for the blurs and the fold warp.
  const PAD = 40;
  const x0 = Math.max(0, Math.floor(bx0) - PAD);
  const x1 = Math.min(W - 1, Math.ceil(bx1) + PAD);
  const y0 = Math.max(0, Math.floor(by0) - PAD);
  const y1 = Math.min(H - 1, Math.ceil(by1) + PAD);
  const rw = x1 - x0 + 1;
  const rh = y1 - y0 + 1;

  // Photo luminance of the work area, and the three scales of it.
  const L = new Float32Array(rw * rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = ((y + y0) * W + x + x0) * 4;
      L[y * rw + x] = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
    }
  }
  const low = blur(L, rw, rh, 22); // folds, body shading
  const mid = blur(L, rw, rh, 3);
  const midSoft = blur(mid, rw, rh, 9);
  const height = blur(L, rw, rh, 10); // soft height map for the warp

  // "White" of the garment = bright percentile under the print.
  const [lenX, lenY] = map.size;
  const inside: number[] = [];
  for (let y = 0; y < rh; y += 3) {
    for (let x = 0; x < rw; x += 3) {
      const [u, v] = map.inverse(x + x0 + 0.5, y + y0 + 0.5);
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) inside.push(L[y * rw + x]!);
    }
  }
  inside.sort((a, b) => a - b);
  const white = inside[Math.floor(inside.length * 0.97)] ?? 255;

  const at = (cx: number, cy: number, k: number) => dd[(cy * dw + cx) * 4 + k]!;
  for (let y = 1; y < rh - 1; y++) {
    for (let x = 1; x < rw - 1; x++) {
      const k = y * rw + x;
      // The ink follows the folds: look the design up a little uphill/downhill.
      const gx = (height[k + 1]! - height[k - 1]!) / 2;
      const gy = (height[k + rw]! - height[k - rw]!) / 2;
      const [u, v] = map.inverse(
        x + x0 + 0.5 - ink.warp * gx,
        y + y0 + 0.5 - ink.warp * gy,
      );
      // Soft 1 px edge so a tilted rectangle is not jagged.
      const cover = maskData
        ? maskData[((y + y0) * W + x + x0) * 4]! / 255
        : Math.min(
            1,
            u * lenX + 0.5,
            (1 - u) * lenX + 0.5,
            v * lenY + 0.5,
            (1 - v) * lenY + 0.5,
          );
      if (cover <= 0) continue;
      const fx = Math.min(dw - 1, Math.max(0, u * dw - 0.5));
      const fy = Math.min(dh - 1, Math.max(0, v * dh - 0.5));
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const jx = Math.min(dw - 1, ix + 1);
      const jy = Math.min(dh - 1, iy + 1);
      const tx = fx - ix;
      const ty = fy - iy;
      const mix = (c: number) =>
        (at(ix, iy, c) * (1 - tx) + at(jx, iy, c) * tx) * (1 - ty) +
        (at(ix, jy, c) * (1 - tx) + at(jx, jy, c) * tx) * ty;
      const alpha = mix(3) / 255;
      if (alpha <= 0) continue;

      const grain = mid[k]! / Math.max(1, midSoft[k]!); // ~1: fine thread detail
      const broad = Math.min(
        1,
        Math.max(0.15, 1 - ink.shadow * (1 - Math.min(1, low[k]! / white))),
      );
      const shade = Math.min(
        1,
        broad * Math.min(1.15, Math.max(0.7, 1 + ink.grain * (grain - 1))),
      );
      // Thread ridges (brighter than their surroundings) take a thinner coat.
      const ridge = Math.max(0, grain - 1) * 6;
      const coat =
        ink.opacity *
        (1 - Math.min(ink.ridgeDropout, ridge * ink.ridgeDropout));
      const a = alpha * cover * coat;
      const i = ((y + y0) * W + x + x0) * 4;
      // Fabric weave: fine light/dark mottling (not capped, the canvas clamps).
      const m = shade * (1 + ink.weave * fabricNoise(x + x0, y + y0));
      px[i] = px[i]! * (1 - a) + mix(0) * m * a;
      px[i + 1] = px[i + 1]! * (1 - a) + mix(1) * m * a;
      px[i + 2] = px[i + 2]! * (1 - a) + mix(2) * m * a;
    }
  }
  ctx.putImageData(img, 0, 0);
  let out = canvas;
  if (spec.crop) {
    const { x, y, size, outPx } = spec.crop;
    out = document.createElement("canvas");
    out.width = outPx;
    out.height = outPx;
    const octx = out.getContext("2d");
    if (!octx) throw new Error("Canvas not available");
    octx.imageSmoothingQuality = "high";
    octx.drawImage(canvas, x, y, size, size, 0, 0, outPx, outPx);
  }
  const url = out.toDataURL("image/webp", 0.85);
  return url.startsWith("data:image/webp")
    ? url
    : out.toDataURL("image/jpeg", 0.85);
}
