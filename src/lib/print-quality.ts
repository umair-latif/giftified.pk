import {
  DEFAULT_DPI_THRESHOLDS,
  dpiStatus,
  effectiveDpi2D,
  type DpiStatus,
  type DpiThresholds,
} from "./dpi";

/**
 * Print-quality report for a saved design. Used by the editor banner, the
 * checkout (block below 150 DPI) and the server. Pure: reads Fabric JSON only.
 */
export interface ImageQuality {
  assetId: string | null;
  dpi: number;
  status: DpiStatus;
}

export interface PrintQualityReport {
  images: ImageQuality[];
  /** Template sample photos still in the design; they must be replaced before ordering. */
  placeholders: number;
  /** Lowest effective DPI across images, or null when the design has no images. */
  worstDpi: number | null;
  status: DpiStatus;
}

interface ImageLike {
  sourceWidthPx: number;
  sourceHeightPx: number;
  /** Printed size in mm (object width × scale). */
  widthMm: number;
  heightMm: number;
}

export function imageDpi(img: ImageLike): number {
  return effectiveDpi2D(
    { widthPx: img.sourceWidthPx, heightPx: img.sourceHeightPx },
    { widthMm: img.widthMm, heightMm: img.heightMm },
  );
}

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

export function printQualityReport(
  fabric: Record<string, unknown>,
  thresholds: DpiThresholds = DEFAULT_DPI_THRESHOLDS,
): PrintQualityReport {
  const objects = Array.isArray(fabric.objects)
    ? (fabric.objects as Record<string, unknown>[])
    : [];
  // Customer's photos (samples) are never printed: counted, not graded.
  const images = objects
    .filter(
      (o) =>
        typeof o.type === "string" &&
        o.type.toLowerCase() === "image" &&
        o.placeholder !== true,
    )
    .map((o) => {
      // Cropped images use only part of the original: scale by the visible fraction.
      const visibleW = num(o.width) / num(o.previewWidthPx, num(o.width));
      const visibleH = num(o.height) / num(o.previewHeightPx, num(o.height));
      const dpi = imageDpi({
        sourceWidthPx:
          num(o.sourceWidthPx) * (Number.isFinite(visibleW) ? visibleW : 1),
        sourceHeightPx:
          num(o.sourceHeightPx) * (Number.isFinite(visibleH) ? visibleH : 1),
        widthMm: num(o.width) * num(o.scaleX, 1),
        heightMm: num(o.height) * num(o.scaleY, 1),
      });
      return {
        assetId: typeof o.assetId === "string" ? o.assetId : null,
        dpi,
        status: dpiStatus(dpi, thresholds),
      };
    });
  const worstDpi = images.length ? Math.min(...images.map((i) => i.dpi)) : null;
  const placeholders = objects.filter(
    (o) =>
      typeof o.type === "string" &&
      o.type.toLowerCase() === "image" &&
      o.placeholder === true,
  ).length;
  return {
    images,
    placeholders,
    worstDpi,
    status: worstDpi === null ? "ok" : dpiStatus(worstDpi, thresholds),
  };
}
