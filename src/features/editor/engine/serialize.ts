import type { Canvas } from "fabric";
import type { PrintArea, ProductId } from "@/config/products";
import { DESIGN_SCHEMA_VERSION, type DesignDocument } from "@/types/design";
import { toPortableFabric } from "../assets/asset-ref";

export { DESIGN_SCHEMA_VERSION, type DesignDocument } from "@/types/design";

export function toDesignDocument(
  canvas: Canvas,
  productId: ProductId,
  printArea: PrintArea,
): DesignDocument {
  // Images are stored as `asset:<id>` refs, never as blob:/data: URLs.
  const fabric = toPortableFabric(canvas.toObject() as Record<string, unknown>);
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
