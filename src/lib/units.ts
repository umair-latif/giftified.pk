/**
 * Physical unit conversions. All product geometry is authored in millimetres;
 * pixels are always derived from mm + a DPI, never hardcoded.
 */
export const MM_PER_INCH = 25.4;

/** Print resolution for production files sent to vendors. */
export const PRINT_DPI = 300;

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

export function inchesToMm(inches: number): number {
  return inches * MM_PER_INCH;
}

/** Exact (fractional) pixel count for a length in mm at a given DPI. */
export function mmToPx(mm: number, dpi: number): number {
  assertPositiveDpi(dpi);
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px: number, dpi: number): number {
  assertPositiveDpi(dpi);
  return (px / dpi) * MM_PER_INCH;
}

/**
 * Integer pixel size of a print file. Rounds to nearest so a 216mm @ 300 DPI
 * area is 2551px (2551.18…), matching what vendors' RIP software expects.
 */
export function printPixelSize(
  widthMm: number,
  heightMm: number,
  dpi: number = PRINT_DPI,
): { width: number; height: number } {
  return {
    width: Math.round(mmToPx(widthMm, dpi)),
    height: Math.round(mmToPx(heightMm, dpi)),
  };
}

function assertPositiveDpi(dpi: number): void {
  if (!(dpi > 0) || !Number.isFinite(dpi)) {
    throw new RangeError(`DPI must be a positive finite number, got ${dpi}`);
  }
}
