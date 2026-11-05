import type { ProductConfig } from "@/config/products";
import {
  centreY,
  columnAngleDeg,
  designXmm,
  outlineBand,
  printBandTop,
  verticalPxPerMm,
  type MockupSide,
  type WrapGeometry,
} from "./mapping";
import { MOCKUP_QUALITY } from "./resolution";
import { isGarmentSpec, type ProductMockupSpec } from "./specs";

/** Dark mugs: how much of the body's shading darkens the ink (0 = none, 1 = all). */
const DARK_SHADE = 0.45;
/** Dark mugs: how strongly the glaze's brightest highlights show over the ink. */
const GLOSS = 0.55;

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

/**
 * Wraps a rendered design (transparent PNG data URL of the whole print area)
 * around the mug photo. The photo's own brightness shades the print
 * (multiply), so gloss and the round falloff carry through. `spec.side` says
 * which half of the wrap the photo shows (handle side); `spec.mirror` flips the
 * photo when it was measured the other way round.
 * Returns a WebP/JPEG data URL at the photo's size.
 */
export async function composeMockup(
  designSrc: string,
  product: ProductConfig,
  spec: ProductMockupSpec,
): Promise<string> {
  if (isGarmentSpec(spec)) {
    const { composeGarmentMockup } = await import("./compose-garment");
    return composeGarmentMockup(designSrc, spec);
  }
  const side: MockupSide = spec.side;
  const [photo, design] = await Promise.all([
    loadImage(spec.src),
    loadImage(designSrc),
  ]);
  const { widthPx: W, heightPx: H } = spec;
  const geo: WrapGeometry = {
    ...spec.geometry,
    wrapMm: product.printArea.widthMm,
  };

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas not available");
  const mirror = !!spec.mirror;
  if (mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(photo, 0, 0, W, H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = ctx.getImageData(0, 0, W, H);
  const px = img.data;

  const dc = document.createElement("canvas");
  dc.width = design.naturalWidth;
  dc.height = design.naturalHeight;
  const dctx = dc.getContext("2d", { willReadFrequently: true });
  if (!dctx) throw new Error("Canvas not available");
  dctx.drawImage(design, 0, 0);
  const dw = dc.width,
    dh = dc.height;
  const dd = dctx.getImageData(0, 0, dw, dh).data;

  const b = spec.body;
  const left = mirror ? W - b.right : b.left;
  const right = mirror ? W - b.left : b.right;
  const cx = (left + right) / 2;
  const r = (right - left) / 2;
  const pxPerMm = verticalPxPerMm(b, spec.mugHeightMm);
  const bandPx = product.printArea.heightMm * pxPerMm;
  const y0 = printBandTop(b, bandPx, pxPerMm, spec.topMarginMm);

  // "White" of the mug = bright percentile of the body, so shading is relative.
  const lums: number[] = [];
  for (let y = Math.ceil(b.top) + 30; y < b.bottom - 30; y += 8) {
    for (let x = Math.ceil(left) + 15; x < right - 15; x += 8) {
      const i = (y * W + x) * 4;
      lums.push(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!);
    }
  }
  lums.sort((a, c) => a - c);
  const white = lums[Math.floor(lums.length * 0.97)] ?? 255;
  // Dark ceramic (`darkBody`): UV ink on black glaze stays bright, so only
  // part of the body's shading darkens it (DARK_SHADE), and the glaze's gloss
  // — anything brighter than the body's typical tone — shines over the print.
  const dark = !!spec.darkBody;
  const typical = lums[Math.floor(lums.length * 0.5)] ?? 0;

  const curve = {
    top: b.top,
    bottom: b.bottom,
    rimSag: spec.sag.rim,
    baseSag: spec.sag.base,
    // A mirrored photo flips left/right, so the tilt flips too.
    tilt: (mirror ? -1 : 1) * (spec.tilt ?? 0),
  };
  const outline = spec.outline;
  // Fractions of the mug height where the print starts and ends.
  const vTop = (y0 - b.top) / (b.bottom - b.top);
  const vBot = vTop + bandPx / (b.bottom - b.top);
  const sagMax =
    Math.max(Math.abs(spec.sag.rim), Math.abs(spec.sag.base)) +
    Math.abs(spec.tilt ?? 0);
  const yFrom = outline ? 0 : Math.max(0, Math.floor(y0 - sagMax - 2));
  const yTo = outline
    ? H - 1
    : Math.min(H - 1, Math.ceil(y0 + bandPx + sagMax + 2));
  // Each photo pixel averages a 3 × 3 grid of points of the design: it is
  // drawn finer than the photo (resolution.ts) and the mug's edge compresses
  // it further, so one sample per pixel would lose thin lines and small text.
  // Everything that depends only on the column (angle, design x, outline
  // edges) is worked out once per column, not per pixel: this loop is the
  // slow part of the Preview step on a phone.
  const SUB = [-1 / 3, 0, 1 / 3];
  const NS = SUB.length;
  const xStart = Math.ceil(left) + 1;
  const xEnd = Math.ceil(right - 1); // exclusive
  const cols = Math.max(0, xEnd - xStart);
  const n = cols * NS;
  const ok = new Uint8Array(n);
  const angles = new Float64Array(n);
  const ix0 = new Int32Array(n);
  const ix1 = new Int32Array(n);
  const txs = new Float64Array(n);
  const eTop = new Float64Array(n);
  const eH = new Float64Array(n);
  for (let c = 0; c < cols; c++) {
    for (let j = 0; j < NS; j++) {
      const k = c * NS + j;
      const sxPhoto = xStart + c + 0.5 + SUB[j]!;
      const angle = columnAngleDeg(sxPhoto, cx, r);
      const mm = designXmm(angle, geo, side);
      if (mm === null) continue;
      ok[k] = 1;
      angles[k] = angle;
      const fx = Math.min(dw - 1, Math.max(0, (mm / geo.wrapMm) * dw - 0.5));
      ix0[k] = Math.floor(fx);
      ix1[k] = Math.min(dw - 1, ix0[k]! + 1);
      txs[k] = fx - ix0[k]!;
      if (outline) {
        // Band edges follow the mug's measured top/base edges in this column.
        const e = outlineBand(
          outline,
          mirror ? W - sxPhoto : sxPhoto,
          vTop,
          vBot,
        );
        eTop[k] = e.top;
        eH[k] = e.bottom - e.top;
      }
    }
  }

  for (let y = yFrom; y <= yTo; y++) {
    for (let c = 0; c < cols; c++) {
      let ar = 0,
        ag = 0,
        ab = 0,
        aa = 0;
      for (let j = 0; j < NS; j++) {
        const k = c * NS + j;
        if (!ok[k]) continue;
        let mid: number;
        let height: number;
        if (outline) {
          mid = y + 0.5 - eTop[k]!;
          height = eH[k]!;
        } else {
          // Row on a flat (centre-of-mug) scale: the band follows the mug's
          // curved horizontal lines. Sub-rows just shift by their offset.
          mid = centreY(y + 0.5, angles[k]!, curve) - y0;
          height = bandPx;
        }
        if (mid < -1 || mid > height + 1) continue;
        const x0 = ix0[k]!;
        const x1 = ix1[k]!;
        const tx = txs[k]!;
        for (let jy = 0; jy < NS; jy++) {
          const inBand = mid + SUB[jy]!;
          // Soft top/bottom edge so the curved edges are not jagged.
          const cover = Math.min(
            1,
            3 * (inBand + 1 / 6),
            3 * (height - inBand + 1 / 6),
          );
          if (cover <= 0) continue;
          const fy = Math.min(
            dh - 1,
            Math.max(0, (inBand / height) * dh - 0.5),
          );
          const y0i = Math.floor(fy);
          const y1i = Math.min(dh - 1, y0i + 1);
          const ty = fy - y0i;
          const r0 = y0i * dw;
          const r1 = y1i * dw;
          const a00 = (r0 + x0) * 4;
          const a01 = (r0 + x1) * 4;
          const a10 = (r1 + x0) * 4;
          const a11 = (r1 + x1) * 4;
          const w00 = (1 - tx) * (1 - ty);
          const w01 = tx * (1 - ty);
          const w10 = (1 - tx) * ty;
          const w11 = tx * ty;
          const alpha =
            dd[a00 + 3]! * w00 +
            dd[a01 + 3]! * w01 +
            dd[a10 + 3]! * w10 +
            dd[a11 + 3]! * w11;
          if (alpha <= 0) continue;
          const a = (alpha / 255) * cover;
          ar +=
            (dd[a00]! * w00 +
              dd[a01]! * w01 +
              dd[a10]! * w10 +
              dd[a11]! * w11) *
            a;
          ag +=
            (dd[a00 + 1]! * w00 +
              dd[a01 + 1]! * w01 +
              dd[a10 + 1]! * w10 +
              dd[a11 + 1]! * w11) *
            a;
          ab +=
            (dd[a00 + 2]! * w00 +
              dd[a01 + 2]! * w01 +
              dd[a10 + 2]! * w10 +
              dd[a11 + 2]! * w11) *
            a;
          aa += a;
        }
      }
      if (aa <= 0) continue;
      const a = aa / (NS * NS);
      const i = (y * W + xStart + c) * 4;
      const lum = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
      const rel = Math.min(1, lum / white);
      const shade = dark ? 1 - DARK_SHADE * (1 - rel) : rel;
      // Gloss over the ink (dark mugs only): 0 at the body's typical tone, 1 at its brightest.
      const gloss = dark
        ? GLOSS * Math.max(0, (lum - typical) / Math.max(1, white - typical))
        : 0;
      const k = shade / aa;
      const inkR = ar * k;
      const inkG = ag * k;
      const inkB = ab * k;
      px[i] = px[i]! * (1 - a) + (inkR + (255 - inkR) * gloss) * a;
      px[i + 1] = px[i + 1]! * (1 - a) + (inkG + (255 - inkG) * gloss) * a;
      px[i + 2] = px[i + 2]! * (1 - a) + (inkB + (255 - inkB) * gloss) * a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/webp", MOCKUP_QUALITY);
  return url.startsWith("data:image/webp")
    ? url
    : canvas.toDataURL("image/jpeg", MOCKUP_QUALITY);
}
