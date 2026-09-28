import type { Canvas } from "canvas";

/** Guard against decompression bombs; ~ a 100 MP photo. */
const MAX_INPUT_PIXELS = 100_000_000;

/**
 * Decodes an ORIGINAL upload (JPEG, PNG or WebP) into a node-canvas Canvas the
 * print renderer can draw. sharp applies EXIF orientation (as the browser did
 * for the editor preview) and converts embedded ICC profiles (e.g. Display P3
 * phone photos) to sRGB; node-canvas alone can't decode WebP or honour ICC.
 */
export async function decodeOriginal(bytes: Uint8Array): Promise<Canvas> {
  const [{ default: sharp }, { createCanvas, ImageData }] = await Promise.all([
    import("sharp"),
    import("canvas"),
  ]);
  const { data, info } = await sharp(bytes, {
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const canvas = createCanvas(info.width, info.height);
  const pixels = new Uint8ClampedArray(
    data.buffer,
    data.byteOffset,
    data.byteLength,
  );
  canvas
    .getContext("2d")
    .putImageData(new ImageData(pixels, info.width, info.height), 0, 0);
  return canvas;
}
