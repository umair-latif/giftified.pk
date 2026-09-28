import * as upngModule from "@pdf-lib/upng";

/**
 * PNG helpers for the proof: decode, shrink with a box filter, re-encode.
 * The proof only needs a thumbnail — the full 300 DPI PNG travels separately —
 * so we downscale before embedding to keep the PDF small.
 */

type Upng = typeof upngModule;
// The package ships `export default UPNG` but its typings declare named
// exports; accept both shapes.
const UPNG: Upng =
  (upngModule as unknown as { default?: Upng }).default ?? upngModule;

export interface RgbaImage {
  width: number;
  height: number;
  /** Straight (non-premultiplied) RGBA, 4 bytes per pixel. */
  data: Uint8Array;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** Width/height from the IHDR chunk, without decoding the image. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  if (!isPng(bytes) || bytes.length < 24) throw new Error("Not a PNG file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export function decodePng(bytes: Uint8Array): RgbaImage {
  if (!isPng(bytes)) throw new Error("Not a PNG file");
  const img = UPNG.decode(toArrayBuffer(bytes));
  const frame = UPNG.toRGBA8(img)[0];
  if (!frame) throw new Error("PNG has no image data");
  return { width: img.width, height: img.height, data: new Uint8Array(frame) };
}

/**
 * Area-average downscale to fit inside maxW × maxH (never upscales).
 * Averages in premultiplied alpha so transparent pixels don't darken edges.
 */
export function downscale(
  src: RgbaImage,
  maxW: number,
  maxH: number,
): RgbaImage {
  const k = Math.min(maxW / src.width, maxH / src.height, 1);
  if (k >= 1) return src;
  const w = Math.max(1, Math.round(src.width * k));
  const h = Math.max(1, Math.round(src.height * k));
  const sx = src.width / w;
  const sy = src.height / h;
  const out = new Uint8Array(w * h * 4);
  const s = src.data;

  for (let dy = 0; dy < h; dy++) {
    const y0 = Math.floor(dy * sy);
    const y1 = Math.max(
      y0 + 1,
      Math.min(src.height, Math.floor((dy + 1) * sy)),
    );
    for (let dx = 0; dx < w; dx++) {
      const x0 = Math.floor(dx * sx);
      const x1 = Math.max(
        x0 + 1,
        Math.min(src.width, Math.floor((dx + 1) * sx)),
      );
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * src.width + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) {
          const al = s[i + 3]!;
          r += s[i]! * al;
          g += s[i + 1]! * al;
          b += s[i + 2]! * al;
          a += al;
        }
      }
      const n = (x1 - x0) * (y1 - y0);
      const o = (dy * w + dx) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
      }
      out[o + 3] = Math.round(a / n);
    }
  }
  return { width: w, height: h, data: out };
}

export function encodePng(img: RgbaImage, colours = 0): Uint8Array {
  return new Uint8Array(
    UPNG.encode([toArrayBuffer(img.data)], img.width, img.height, colours),
  );
}

export interface Thumbnail {
  png: Uint8Array;
  width: number;
  height: number;
}

/**
 * A PNG small enough to embed: fits maxW × maxH and, if possible, `budget`
 * bytes. Tries lossless first, then a 256-colour palette (fine for a proof
 * thumbnail). Returns the input untouched when it already fits.
 */
export function thumbnail(
  bytes: Uint8Array,
  maxW: number,
  maxH: number,
  budget: number,
): Thumbnail {
  const size = pngSize(bytes);
  if (size.width <= maxW && size.height <= maxH && bytes.length <= budget)
    return { png: bytes, ...size };

  const small = downscale(decodePng(bytes), maxW, maxH);
  let png = encodePng(small);
  if (png.length > budget) png = encodePng(small, 256);
  return { png, width: small.width, height: small.height };
}
