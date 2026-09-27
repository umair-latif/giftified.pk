import { PRINT_DPI } from "@/lib/units";
import type { ProductConfig } from "./types";

export const mug = {
  id: "mug",
  name: "Custom Mug",
  subtitle: "11oz gloss white ceramic · full wrap",
  printArea: {
    // 8.5" x 3.5" — common 11oz full-wrap template.
    widthMm: 216,
    heightMm: 89,
    safeMarginMm: 5,
  },
  printDpi: PRINT_DPI,
  baseColors: [{ id: "white", name: "Gloss White", hex: "#ffffff" }],
  wooSku: null,
  edgeLabels: { left: "Handle", right: "Handle" },
  vendorTodo:
    "Confirm wrap width, height, handle gap and safe margin with the Gujrat UV mug vendor.",
} as const satisfies ProductConfig;
