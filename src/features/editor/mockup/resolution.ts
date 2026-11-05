import type { PrintArea } from "@/config/products";

/**
 * How sharp the design must be before it is wrapped onto a product photo.
 *
 * The mug photos (1080 px) show the front of an 83 mm mug about 440 px wide:
 * about 5.3 photo pixels per millimetre of print at the centre. Rendering the
 * design at 8 px/mm gives the wrap ~1.5× more detail than the photo can show,
 * so small text and thin lines stay crisp. Before (Nov 2026) the design was
 * drawn at screen width — ~2 px/mm on a desktop — and the photo stretched it.
 */
export const MOCKUP_PX_PER_MM = 8;
/** Never draw more than this many pixels (memory on low-end phones). */
export const MAX_RENDER_PIXELS = 4_000_000;

/**
 * Width in px to render a design for the Preview step: at least what the
 * screen shows (`screenPx`), at least `MOCKUP_PX_PER_MM`, within the pixel cap.
 */
export function previewRenderWidth(area: PrintArea, screenPx: number): number {
  const want = Math.max(screenPx, area.widthMm * MOCKUP_PX_PER_MM);
  const cap = Math.sqrt((MAX_RENDER_PIXELS * area.widthMm) / area.heightMm);
  return Math.round(Math.max(screenPx, Math.min(want, cap)));
}

/** Output quality of composed product photos (WebP/JPEG). */
export const MOCKUP_QUALITY = 0.92;
