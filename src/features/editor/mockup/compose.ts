import type { ProductConfig } from "@/config/products";
import {
  centreY,
  columnAngleDeg,
  designXmm,
  printBandTop,
  type MockupSide,
  type WrapGeometry,
} from "./mapping";
import type { MockupSpec } from "./specs";

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

/** Bilinear sample of premultiplied-free RGBA at fractional pixel coords. */
function sample(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  fx: number,
  fy: number,
  out: number[],
) {
  const x = Math.min(w - 1, Math.max(0, fx - 0.5));
  const y = Math.min(h - 1, Math.max(0, fy - 0.5));
  const x0 = Math.floor(x),
    y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1),
    y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0,
    ty = y - y0;
  for (let k = 0; k < 4; k++) {
    const a = d[(y0 * w + x0) * 4 + k]!;
    const b = d[(y0 * w + x1) * 4 + k]!;
    const c = d[(y1 * w + x0) * 4 + k]!;
    const e = d[(y1 * w + x1) * 4 + k]!;
    out[k] = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
  }
}

/**
 * Wraps a rendered design (transparent PNG data URL of the whole print area)
 * around the mug photo. The photo's own brightness shades the print
 * (multiply), so gloss and the round falloff carry through. `side: "left"`
 * mirrors the photo (handle on the left) and shows the other half of the wrap.
 * Returns a WebP/JPEG data URL at the photo's size.
 */
export async function composeMockup(
  designSrc: string,
  product: ProductConfig,
  spec: MockupSpec,
  side: MockupSide,
): Promise<string> {
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
  if (side === "left") {
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
  const left = side === "left" ? W - b.right : b.left;
  const right = side === "left" ? W - b.left : b.right;
  const cx = (left + right) / 2;
  const r = (right - left) / 2;
  const pxPerMm = r / (geo.diameterMm / 2);
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

  const curve = {
    top: b.top,
    bottom: b.bottom,
    rimSag: spec.sag.rim,
    baseSag: spec.sag.base,
  };
  const sagMax = Math.max(Math.abs(spec.sag.rim), Math.abs(spec.sag.base));
  const s = [0, 0, 0, 0];
  const SUB = [-1 / 3, 0, 1 / 3];
  const yFrom = Math.max(0, Math.floor(y0 - sagMax - 2));
  const yTo = Math.min(H - 1, Math.ceil(y0 + bandPx + sagMax + 2));
  for (let y = yFrom; y <= yTo; y++) {
    for (let x = Math.ceil(left) + 1; x < right - 1; x++) {
      // Average a few sub-columns: the edge of the mug compresses the design.
      let ar = 0,
        ag = 0,
        ab = 0,
        aa = 0;
      for (const o of SUB) {
        const angle = columnAngleDeg(x + 0.5 + o, cx, r);
        const mm = designXmm(angle, geo, side);
        if (mm === null) continue;
        // Row on a flat (centre-of-mug) scale: the print band follows the
        // mug's curved horizontal lines.
        const inBand = centreY(y + 0.5, angle, curve) - y0;
        // Soft top/bottom edge (1 px) so the curved edges are not jagged.
        const cover = Math.min(1, inBand + 0.5, bandPx - inBand + 0.5);
        if (cover <= 0) continue;
        const fy = Math.min(dh, Math.max(0, (inBand / bandPx) * dh));
        sample(dd, dw, dh, (mm / geo.wrapMm) * dw, fy, s);
        const a = (s[3]! / 255) * cover;
        ar += s[0]! * a;
        ag += s[1]! * a;
        ab += s[2]! * a;
        aa += a;
      }
      if (aa <= 0) continue;
      const a = aa / SUB.length;
      const i = (y * W + x) * 4;
      const shade = Math.min(
        1,
        (0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!) / white,
      );
      const inv = 1 / aa;
      px[i] = px[i]! * (1 - a) + ar * inv * shade * a;
      px[i + 1] = px[i + 1]! * (1 - a) + ag * inv * shade * a;
      px[i + 2] = px[i + 2]! * (1 - a) + ab * inv * shade * a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/webp", 0.85);
  return url.startsWith("data:image/webp")
    ? url
    : canvas.toDataURL("image/jpeg", 0.85);
}
