import { PRINT_DPI } from "@/lib/units";
import type { ProductConfig } from "./types";

/**
 * 11oz mug — PRINT SPECS LIVE HERE. See docs/ops/print-specs.md.
 *
 * Current values are a common 11oz full-wrap template, NOT yet confirmed by the
 * vendor. When the vendor sends real specs, change `printArea` below (in mm);
 * the editor, DPI checks, preview and print files all follow automatically.
 */
export const mug = {
  id: "mug",
  name: "Custom Mug",
  subtitle: "11oz gloss white ceramic · full wrap",
  printArea: {
    /** Printable width in mm — the unrolled wrap, handle edge to handle edge. (8.5") */
    widthMm: 216,
    /** Printable height in mm. (3.5") */
    heightMm: 89,
    /** Keep text/photos at least this far from every edge (dashed blue line in the editor). */
    safeMarginMm: 5,
  },
  /** Resolution of the print file sent to the vendor. Leave at 300 unless the vendor asks. */
  printDpi: PRINT_DPI,
  baseColors: [{ id: "white", name: "Gloss White", hex: "#ffffff" }],
  wooSku: null,
  /** Labels under the editor canvas: where the handle is on the unrolled wrap. */
  edgeLabels: { left: "Handle", right: "Handle" },
  vendorTodo:
    "Confirm wrap width, height, handle gap and safe margin with the Gujrat UV mug vendor.",
} as const satisfies ProductConfig;
