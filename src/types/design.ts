import type { PrintArea, ProductId } from "@/config/products";

/**
 * SHARED CONTRACT — the saved design. Produced by the editor, consumed by the
 * preview, the server print renderer, and stored on the order.
 * Change only with the lead developer's approval (bump the schema version).
 */
export const DESIGN_SCHEMA_VERSION = 1 as const;

export interface DesignDocument {
  schemaVersion: typeof DESIGN_SCHEMA_VERSION;
  productId: ProductId;
  /** All coordinates inside `fabric` are millimetres from the print area's top-left. */
  units: "mm";
  printArea: PrintArea;
  /**
   * Fabric.js `canvas.toObject()` output (objects array, version). No viewport transform.
   * Images: `src` is `asset:<id>` (never a blob:/data: URL) and each image carries
   * `assetId`, `sourceWidthPx`, `sourceHeightPx` (pixel size of the ORIGINAL upload).
   * Also `previewWidthPx`/`previewHeightPx`: size of the preview the editor drew. `cropX`,
   * `cropY`, `width`, `height` are in PREVIEW pixels; when rendering with the original, scale
   * them by `sourceWidthPx / previewWidthPx` (and divide `scaleX/Y` by the same factor).
   * The print renderer resolves `asset:<id>` to the original file in storage.
   */
  fabric: Record<string, unknown>;
}

/** Structural check for designs coming from storage or over the network. */
export function isDesignDocument(
  v: unknown,
  productId?: ProductId,
): v is DesignDocument {
  if (typeof v !== "object" || v === null) return false;
  const d = v as Partial<DesignDocument>;
  const area = d.printArea as Partial<PrintArea> | undefined;
  return (
    d.schemaVersion === DESIGN_SCHEMA_VERSION &&
    typeof d.productId === "string" &&
    (productId === undefined || d.productId === productId) &&
    d.units === "mm" &&
    typeof area?.widthMm === "number" &&
    typeof area.heightMm === "number" &&
    typeof d.fabric === "object" &&
    d.fabric !== null &&
    Array.isArray((d.fabric as { objects?: unknown }).objects)
  );
}
