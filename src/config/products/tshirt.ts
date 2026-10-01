import { PRINT_DPI } from "@/lib/units";
import type { ProductConfig } from "./types";

/** Front-only DTF development config. Task 27 defaults, not production specs. */
export const tshirt = {
  id: "tshirt",
  name: "Custom T-Shirt",
  subtitle: "Front print · DTF",
  printArea: {
    widthMm: 300,
    heightMm: 400,
    safeMarginMm: 10,
  },
  printDpi: PRINT_DPI,
  // Provisional colour names and illustrative swatches, not confirmed garments.
  baseColors: [
    { id: "white", name: "White", hex: "#ffffff" },
    { id: "black", name: "Black", hex: "#171717" },
    { id: "navy", name: "Navy", hex: "#1e3a5f" },
    { id: "red", name: "Red", hex: "#b91c1c" },
    { id: "heather-grey", name: "Heather Grey", hex: "#9ca3af" },
  ],
  wooSku: null,
  vendorTodo:
    "Task 27 placeholders only. Confirm printable width/height, safe margin, distance below collar centre/neckline and DTF file requirements with the vendor. Founder must confirm colours, sizes, size chart, prices, garment photos and front-only scope before launch.",
} as const satisfies ProductConfig;
