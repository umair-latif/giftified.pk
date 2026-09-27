export type ProductId = "mug" | "tshirt" | "hoodie";

export interface BaseColor {
  id: string;
  name: string;
  hex: `#${string}`;
}

export interface PrintArea {
  /** Printable width in mm (for mugs: the unrolled wrap width). */
  widthMm: number;
  heightMm: number;
  /** Keep important content this far inside every edge. */
  safeMarginMm: number;
}

export interface ProductConfig {
  id: ProductId;
  name: string;
  /** Short line shown under the title in the editor. */
  subtitle: string;
  printArea: PrintArea;
  printDpi: number;
  baseColors: readonly BaseColor[];
  /** Links this config to the WooCommerce product. Filled once WC is set up. */
  wooSku: string | null;
  /** Labels drawn at the print-area edges in the editor (e.g. mug handle seam). */
  edgeLabels?: { left: string; right: string };
  /** Unconfirmed values that must be checked with the vendor before launch. */
  vendorTodo?: string;
}
