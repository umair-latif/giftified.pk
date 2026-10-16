/**
 * Every product id, in catalog order. THE source of truth: `ProductId` is
 * derived from it, the WooCommerce SKU list is it, and the Zod schemas that
 * accept a product id use it (`z.enum(PRODUCT_IDS)`).
 *
 * Adding a product here is what makes the shop ask WooCommerce for it. Before
 * this was one list, a new id type-checked everywhere while half a dozen
 * hand-written lists quietly left it out (the Two-Tone Mug, Oct 2026).
 */
export const PRODUCT_IDS = ["mug", "two-tone-mug", "tshirt", "hoodie"] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

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
