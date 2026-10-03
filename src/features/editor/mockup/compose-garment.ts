import type { GarmentMockupSpec } from "./specs";

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  return img.decode().then(() => img);
}

/**
 * Lays a rendered design (transparent PNG data URL of the whole print area)
 * on a garment photo. The print rectangle is mapped onto the photo through
 * `spec.quad` (an affine map, so tilted shirts work) and multiplied by the
 * photo's own brightness, so folds and shadows show through the ink.
 * Returns a WebP/JPEG data URL at the photo's size.
 */
export async function composeGarmentMockup(
  designSrc: string,
  spec: GarmentMockupSpec,
): Promise<string> {
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

  // Design pixels, drawn once at (up to) its own size.
  const dw = design.naturalWidth;
  const dh = design.naturalHeight;
  const dc = document.createElement("canvas");
  dc.width = dw;
  dc.height = dh;
  const dctx = dc.getContext("2d", { willReadFrequently: true });
  if (!dctx) throw new Error("Canvas not available");
  dctx.drawImage(design, 0, 0);
  const dd = dctx.getImageData(0, 0, dw, dh).data;

  // Photo (x, y) -> print (u, v) in 0..1: invert [ex ey] * [u v]ᵀ = p - tl.
  const { tl, tr, bl } = spec.quad;
  const ex = [tr[0] - tl[0], tr[1] - tl[1]] as const;
  const ey = [bl[0] - tl[0], bl[1] - tl[1]] as const;
  const det = ex[0] * ey[1] - ex[1] * ey[0];
  if (Math.abs(det) < 1e-6) throw new Error("Bad garment quad");
  const br = [tr[0] + ey[0], tr[1] + ey[1]] as const;
  const xs = [tl[0], tr[0], bl[0], br[0]];
  const ys = [tl[1], tr[1], bl[1], br[1]];
  const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 1);
  const x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)) + 1);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 1);
  const y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)) + 1);

  // "White" of the garment = bright percentile under the print, so the shading
  // is relative (a slightly grey photo does not dim the ink).
  const lum = (i: number) =>
    0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
  const lums: number[] = [];
  for (let y = y0; y <= y1; y += 4) {
    for (let x = x0; x <= x1; x += 4) lums.push(lum((y * W + x) * 4));
  }
  lums.sort((a, b) => a - b);
  const white = lums[Math.floor(lums.length * 0.97)] ?? 255;

  const lenX = Math.hypot(ex[0], ex[1]);
  const lenY = Math.hypot(ey[0], ey[1]);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - tl[0];
      const dy = y + 0.5 - tl[1];
      const u = (dx * ey[1] - dy * ey[0]) / det;
      const v = (ex[0] * dy - ex[1] * dx) / det;
      // Soft 1 px edge so a tilted rectangle is not jagged.
      const cover = Math.min(
        1,
        u * lenX + 0.5,
        (1 - u) * lenX + 0.5,
        v * lenY + 0.5,
        (1 - v) * lenY + 0.5,
      );
      if (cover <= 0) continue;
      // Bilinear sample of the design.
      const fx = Math.min(dw - 1, Math.max(0, u * dw - 0.5));
      const fy = Math.min(dh - 1, Math.max(0, v * dh - 0.5));
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const jx = Math.min(dw - 1, ix + 1);
      const jy = Math.min(dh - 1, iy + 1);
      const tx = fx - ix;
      const ty = fy - iy;
      const at = (cx: number, cy: number, k: number) =>
        dd[(cy * dw + cx) * 4 + k]!;
      const mix = (k: number) =>
        (at(ix, iy, k) * (1 - tx) + at(jx, iy, k) * tx) * (1 - ty) +
        (at(ix, jy, k) * (1 - tx) + at(jx, jy, k) * tx) * ty;
      const a = (mix(3) / 255) * cover;
      if (a <= 0) continue;
      const i = (y * W + x) * 4;
      const shade = Math.min(1, lum(i) / white);
      px[i] = px[i]! * (1 - a) + mix(0) * shade * a;
      px[i + 1] = px[i + 1]! * (1 - a) + mix(1) * shade * a;
      px[i + 2] = px[i + 2]! * (1 - a) + mix(2) * shade * a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL("image/webp", 0.85);
  return url.startsWith("data:image/webp")
    ? url
    : canvas.toDataURL("image/jpeg", 0.85);
}
