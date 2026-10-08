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
  printArea: {
    widthMm: 280,
    heightMm: 300,
    safeMarginMm: 10,
  },
  printDpi: PRINT_DPI,
  // Launch range (founder): heather grey only. A new colour also needs its own
  // preview photos (docs/ops/mockup-assets.md).
  baseColors: [{ id: "grey", name: "Heather Grey", hex: "#b4b7bc" }],
  wooSku: null,
  vendorTodo:
    "Task 28 placeholders only. Confirm printable width/height above the kangaroo pocket, safe margin, distance below the collar and DTF file requirements with the vendor. Founder must confirm sizes, size chart, price and garment photos, and whether printing on the pocket or hood is ever wanted.",
} as const satisfies ProductConfig;
