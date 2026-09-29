import type { ProductId } from "@/config/products";
import type { MockupSide, WrapGeometry } from "./mapping";

/**
 * A photographed product the design is wrapped onto. Pixel values are in the
 * coordinates of `src` (public/mockups/*.webp), NOT print pixels.
 *
 * TODO(vendor): `geometry.diameterMm` and `mugHeightMm` are Printful's
 * approximate 11oz size. Confirm them and the handle gap with the vendor
 * (docs/ops/print-specs.md). Kept here rather than in src/config/products/
 * until a dedicated config PR moves it.
 */
export interface MockupSpec {
  /** Stable id, also the preview tab key. */
  id: string;
  /** Tab label. */
  label: string;
  /** Which half of the wrap this photo shows: "right" = handle on the right. */
  side: MockupSide;
  src: string;
  widthPx: number;
  heightPx: number;
  /**
   * Mug body on the photo: left/right silhouette x, and y of the rim's front
   * edge (top) and of the base's front edge (bottom) at the centre.
   */
  body: { left: number; right: number; top: number; bottom: number };
  geometry: Omit<WrapGeometry, "wrapMm">;
  /**
   * Height of the mug body in mm. The print band is sized against it (so a
   * 89 mm print on a 96 mm mug fills ~93% of the body on the photo), not
   * against the diameter, because the photographed mug's proportions differ.
   */
  mugHeightMm: number;
  /** How much horizontal lines curve on the photo: px lower at the centre than at the edges. */
  sag: { rim: number; base: number };
  /**
   * Distance from the rim to the top of the print, in mm. Omit to centre the
   * print vertically on the body. Set it once the vendor gives the value.
   * (The printed height is not here: it is the product's `printArea.heightMm`.)
   */
  topMarginMm?: number;
  /** Photo credit (Unsplash licence: attribution optional, kept for records). */
  credit: string;
}

/** Straight-on side photo, handle on the right. The left view mirrors it. */
const MUG_SIDE = {
  src: "/mockups/mug-side.webp",
  widthPx: 822,
  heightPx: 642,
  body: { left: 217.2, right: 604.2, top: 82.8, bottom: 573 },
  // Printful 11oz (approx.): 8.3 cm across, 9.6 cm tall. Vendor to confirm.
  geometry: { diameterMm: 83 },
  mugHeightMm: 96,
  // Measured on the photo: the base edge is ~20 px lower at the centre; the
  // camera is at rim height, so the rim is nearly straight (slightly up).
  sag: { rim: -6, base: 20 },
  credit: "Unsplash",
} as const;

export const MOCKUP_SPECS: Partial<Record<ProductId, readonly MockupSpec[]>> = {
  mug: [
    { ...MUG_SIDE, id: "left", label: "Left", side: "left" },
    { ...MUG_SIDE, id: "right", label: "Right", side: "right" },
    {
      id: "lifestyle",
      label: "Lifestyle",
      side: "right",
      src: "/mockups/mug-lifestyle.webp",
      widthPx: 900,
      heightPx: 900,
      body: { left: 232, right: 596, top: 260, bottom: 677 },
      // The photo is from ~20 deg above (both rim and base curve down) and the
      // mug is turned so the handle is ~64 deg from the camera.
      geometry: { diameterMm: 83, handleAngleDeg: 64 },
      mugHeightMm: 96,
      sag: { rim: 48, base: 65 },
      credit: "Unsplash",
    },
  ],
};
