import { PRINT_DPI } from "@/lib/units";
import type { ProductConfig } from "./types";

/**
 * Front-only DTF development config (task 28). Placeholder values: the print
 * area stops above the kangaroo pocket. Founder/vendor confirm the real numbers.
 */
export const hoodie = {
  id: "hoodie",
  name: "Custom Hoodie",
  subtitle: "Front chest print · DTF",
  // Founder's marked box on the photo (8 Oct 2026): 30 x 22 cm above the pocket.
  // TODO(vendor): confirm the printable size and the distance below the collar.
  printArea: {
    widthMm: 300,
    heightMm: 220,
    safeMarginMm: 10,
  },
  printDpi: PRINT_DPI,
  // Launch range (founder, 8 Oct 2026): white and heather grey. Grey photos are
  // recoloured from the white ones until real grey photos exist
  // (docs/ops/mockup-assets.md).
  baseColors: [
    { id: "white", name: "White", hex: "#ffffff" },
    { id: "grey", name: "Heather Grey", hex: "#b4b7bc" },
  ],
  wooSku: null,
  vendorTodo:
    "Task 28 placeholders only. Confirm printable width/height above the kangaroo pocket, safe margin, distance below the collar and DTF file requirements with the vendor. Founder must confirm sizes, size chart, price and garment photos, and whether printing on the pocket or hood is ever wanted.",
} as const satisfies ProductConfig;
