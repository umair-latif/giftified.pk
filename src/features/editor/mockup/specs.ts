import type { ProductId } from "@/config/products";
import type { WrapGeometry } from "./mapping";

/**
 * A photographed product the design is wrapped onto. Pixel values are in the
 * coordinates of `src` (public/mockups/*.webp), NOT print pixels.
 *
 * TODO(vendor): `geometry.diameterMm` is an assumed 11oz size. Confirm it and
 * the handle gap with the vendor (docs/ops/print-specs.md). Kept here rather
 * than in src/config/products/ until a dedicated config PR moves it.
 */
export interface MockupSpec {
  src: string;
  widthPx: number;
  heightPx: number;
  /** Mug body on the photo: left/right silhouette x, rim y and base y. */
  body: { left: number; right: number; top: number; bottom: number };
  geometry: Omit<WrapGeometry, "wrapMm">;
  /** Printed height as mm, centred vertically on the body. */
  printHeightMm: number;
  /** Photo credit (Unsplash licence: attribution optional, kept for records). */
  credit: string;
}

export const MOCKUP_SPECS: Partial<Record<ProductId, MockupSpec>> = {
  mug: {
    src: "/mockups/mug-side.webp",
    widthPx: 822,
    heightPx: 642,
    body: { left: 217.2, right: 604.2, top: 82.8, bottom: 573 },
    geometry: { diameterMm: 82 },
    printHeightMm: 89,
    credit: "Unsplash",
  },
};
