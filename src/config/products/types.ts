export type ProductId = "mug" | "two-tone-mug" | "tshirt" | "hoodie";

export interface BaseColor {
  id: string;
  name: string;
  /** The swatch the customer picks: the colour that makes this option look different. */
  hex: `#${string}`;
  /**
   * The colour the print actually sits on, when it is not `hex`. A Two-Tone
   * Mug is picked by its rim and handle colour but printed on its white body,
   * so the editor canvas and the dark-text rule follow this instead.
   */
  bodyHex?: `#${string}`;
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
  /**
   * How the design is printed: a mug is one full wrap around the body (both
   * short edges meet at the handle), a garment is a flat rectangle. Decides
   * the vendor PDF's placement diagram and note, the photo tips, and whether
   * soft shadows are allowed (vendors print them on mugs, not on DTF cloth).
   */
  kind: "mug" | "garment";
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
