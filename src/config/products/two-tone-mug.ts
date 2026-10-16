import { PRINT_DPI } from "@/lib/units";
import type { ProductConfig } from "./types";

/**
 * 11oz Dual Accent Mug (founder's photos, Oct 2026): a white body with a
 * coloured rim, handle and inside. The design prints on the white body, so
 * every colour has the same white `bodyHex`; the swatch shows the rim colour.
 *
 * Same cup as `mug.ts`, so it shares that product's print area. Both are
 * a common 11oz full-wrap template, NOT yet confirmed by the vendor.
 *
 * The id stays `two-tone-mug` although the name is now "Dual Accent Mug"
 * (founder, 17 Oct 2026): the id is the WooCommerce SKU and the product's URL,
 * so renaming it would unlink the product from the store and break links
 * already shared. Only what customers read changed.
 */
export const twoToneMug = {
  id: "two-tone-mug",
  kind: "mug",
  name: "Dual Accent Mug",
  subtitle: "11oz gloss ceramic · coloured rim, handle and inside · full wrap",
  printArea: {
    /** The unrolled wrap, handle edge to handle edge. Same cup as the Custom Mug. */
    widthMm: 228,
    heightMm: 89,
    safeMarginMm: 5,
  },
  printDpi: PRINT_DPI,
  /** Rim/handle colours sampled from the founder's photos; the body is white. */
  baseColors: [
    { id: "red", name: "Red", hex: "#c93940", bodyHex: "#ffffff" },
    { id: "blue", name: "Blue", hex: "#2c589f", bodyHex: "#ffffff" },
    { id: "black", name: "Black", hex: "#1b1b1b", bodyHex: "#ffffff" },
  ],
  wooSku: null,
  edgeLabels: { left: "Handle", right: "Handle" },
  vendorTodo:
    "Confirm the wrap width and height, the handle gap and how close the print may come to the coloured rim.",
} as const satisfies ProductConfig;
