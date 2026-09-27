import type { PrintArea } from "@/config/products";
import { maxPrintWidthMm } from "@/lib/dpi";

/** Images start at a size that prints well: never below this DPI if avoidable. */
export const INITIAL_MIN_DPI = 200;
const MIN_START_WIDTH_MM = 20;
const SAFE_FILL = 0.9;

/**
 * Starting printed width (mm) for a new image: as large as fits inside the
 * safe zone, but not so large that it would drop below 200 DPI. Tiny images
 * still start at a visible size (and show the low-quality warning).
 */
export function initialImageWidthMm(
  source: { widthPx: number; heightPx: number },
  area: PrintArea,
): number {
  const aspect = source.widthPx / source.heightPx;
  const safeW = (area.widthMm - 2 * area.safeMarginMm) * SAFE_FILL;
  const safeH = (area.heightMm - 2 * area.safeMarginMm) * SAFE_FILL;
  const containW = Math.min(safeW, safeH * aspect);
  const sharpW = maxPrintWidthMm(source.widthPx, INITIAL_MIN_DPI);
  return Math.min(containW, Math.max(sharpW, MIN_START_WIDTH_MM));
}
