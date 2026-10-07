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
  // Launch range (founder): white and black only. Each colour has its own
  // preview photos, so adding one later also needs photos (docs/ops/mockup-assets.md).
  baseColors: [
    { id: "white", name: "White", hex: "#ffffff" },
    { id: "black", name: "Black", hex: "#171717" },
  ],
  wooSku: null,
  vendorTodo:
    "Task 27 placeholders only. Confirm printable width/height, safe margin, distance below collar centre/neckline and DTF file requirements with the vendor. Founder must confirm sizes, size chart, prices, garment photos and front-only scope before launch.",
} as const satisfies ProductConfig;
