import { mmToInches } from "./units";

/**
 * Effective DPI = source pixels ÷ printed inches, at the image's CURRENT size
 * on the print area. Embedded EXIF/JFIF DPI metadata is meaningless for print
 * quality and must never be used.
 */
export function effectiveDpi(sourcePx: number, printedMm: number): number {
  if (!(printedMm > 0)) return Number.POSITIVE_INFINITY;
  if (!(sourcePx > 0)) return 0;
  return sourcePx / mmToInches(printedMm);
}

/** Worst axis wins: a stretched image is only as sharp as its weakest axis. */
export function effectiveDpi2D(
  source: { widthPx: number; heightPx: number },
  printed: { widthMm: number; heightMm: number },
): number {
  return Math.min(
    effectiveDpi(source.widthPx, printed.widthMm),
    effectiveDpi(source.heightPx, printed.heightMm),
  );
}

export interface DpiThresholds {
  /** At or above this, quality is fine. */
  warnBelow: number;
  /** Below this, checkout is blocked. */
  blockBelow: number;
}

export const DEFAULT_DPI_THRESHOLDS: DpiThresholds = {
  warnBelow: 200,
  blockBelow: 150,
};

export type DpiStatus = "ok" | "warn" | "block";

export function dpiStatus(
  dpi: number,
  thresholds: DpiThresholds = DEFAULT_DPI_THRESHOLDS,
): DpiStatus {
  if (dpi < thresholds.blockBelow) return "block";
  if (dpi < thresholds.warnBelow) return "warn";
  return "ok";
}

/**
 * Largest printed width (mm) an image can have while staying at or above
 * `minDpi`. Used to cap scaling handles and to size images on insert.
 */
export function maxPrintWidthMm(sourcePx: number, minDpi: number): number {
  return (sourcePx / minDpi) * 25.4;
}
