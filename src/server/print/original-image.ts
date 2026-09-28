/**
 * The editor draws a PREVIEW copy of each photo (≤2048 px), so a saved image
 * object's `cropX`, `cropY`, `width` and `height` are in preview pixels and its
 * `scaleX`/`scaleY` map preview pixels to mm. The print renderer draws the
 * ORIGINAL instead, so those values are rescaled here. Printed size, position
 * and crop stay identical. Pure, unit-tested.
 */
export interface SavedImageGeometry {
  cropX?: unknown;
  cropY?: unknown;
  width?: unknown;
  height?: unknown;
  scaleX?: unknown;
  scaleY?: unknown;
  sourceWidthPx?: unknown;
  sourceHeightPx?: unknown;
  previewWidthPx?: unknown;
  previewHeightPx?: unknown;
}

export interface ImageGeometry {
  cropX: number;
  cropY: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const positive = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/**
 * Geometry for drawing the original instead of the preview.
 * k = sourceWidthPx / previewWidthPx (heights for the y axis). Without
 * `previewWidthPx` the preview is assumed to have been the whole image, so
 * k = sourceWidthPx / width.
 *
 * @param original pixel size of the decoded original; defaults to the
 *   `sourceWidthPx`/`sourceHeightPx` stored on the object.
 */
export function toOriginalGeometry(
  obj: SavedImageGeometry,
  original?: { width: number; height: number },
): ImageGeometry {
  const width = num(obj.width, 0);
  const height = num(obj.height, 0);
  const srcW = original?.width ?? positive(obj.sourceWidthPx);
  const srcH = original?.height ?? positive(obj.sourceHeightPx);
  if (!srcW || !srcH || !(width > 0) || !(height > 0)) {
    throw new Error(
      "Image object needs width, height and sourceWidthPx/sourceHeightPx to be printed",
    );
  }
  const previewW = positive(obj.previewWidthPx) ?? width;
  const previewH = positive(obj.previewHeightPx) ?? height;
  const kx = srcW / previewW;
  const ky = srcH / previewH;
  return {
    cropX: num(obj.cropX, 0) * kx,
    cropY: num(obj.cropY, 0) * ky,
    width: width * kx,
    height: height * ky,
    scaleX: num(obj.scaleX, 1) / kx,
    scaleY: num(obj.scaleY, 1) / ky,
  };
}
