import type { Canvas } from "fabric";
import type { PrintArea, ProductId } from "@/config/products";

export const DESIGN_SCHEMA_VERSION = 1 as const;

/**
 * What gets saved and sent to the print worker. Coordinates are mm inside the
 * print area; the worker renders this at PRINT_DPI to make the vendor PNG.
 */
export interface DesignDocument {
  schemaVersion: typeof DESIGN_SCHEMA_VERSION;
  productId: ProductId;
  units: "mm";
  printArea: PrintArea;
  fabric: Record<string, unknown>;
}

export function toDesignDocument(
  canvas: Canvas,
  productId: ProductId,
  printArea: PrintArea,
): DesignDocument {
  const fabric = canvas.toObject() as Record<string, unknown>;
  // Screen-only state never belongs in the print document.
  delete fabric.backgroundColor;
  return {
    schemaVersion: DESIGN_SCHEMA_VERSION,
    productId,
    units: "mm",
    printArea: { ...printArea },
    fabric,
  };
}
