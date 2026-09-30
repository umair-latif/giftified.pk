import type { ProductId } from "@/config/products";
import type { MockupSide, Outline, WrapGeometry } from "./mapping";

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
  /** Flip the photo left/right before use (body coordinates are in the unflipped photo). */
  mirror?: boolean;
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
   * Measured top and base edges of the mug (photo pixels, left to right). When
   * set, the print band follows them exactly and `sag` / `tilt` are unused for
   * placement. Use it when the mug is tilted or not a clean cylinder.
   */
  outline?: Outline;
  /** Photo tilt: px the horizontal lines are higher at the right silhouette than the left (negative = lower). */
  tilt?: number;
  /**
   * Distance from the rim to the top of the print, in mm. Omit to centre the
   * print vertically on the body. Set it once the vendor gives the value.
   * (The printed height is not here: it is the product's `printArea.heightMm`.)
   */
  topMarginMm?: number;
  /** Photo credit (Unsplash licence: attribution optional, kept for records). */
  credit: string;
}

/**
 * The Canva mug set (1080 x 1080). Photos are interchangeable: to change the
 * background, props or colours, replace the file and re-measure `body`, `sag`
 * and `handleAngleDeg` (docs/ops/mockup-assets.md); nothing else changes.
 *
 * Vector-style studio shots (front/left/right) share one mug, so they share
 * geometry. Their `top` is the top edge of the wall at the centre, and the
 * camera is slightly above the base (base curves down, rim outline curves up).
 */
const STUDIO = {
  widthPx: 1080,
  heightPx: 1080,
  // Printful 11oz (approx.): 8.3 cm across, 9.6 cm tall. Vendor to confirm.
  geometry: { diameterMm: 83 },
  mugHeightMm: 96,
  // Measured on the base line of the images (base +39 px at the centre vs the
  // silhouette edges) and on the top edge of the wall (rim -28 px).
  sag: { rim: -28, base: 39 },
  credit: "Canva",
} as const;

/**
 * Order = the order of the preview tabs and of a design product's stored
 * images (the first one is its main picture): a side view with the handle
 * first, then the front and the other side, then the lifestyle shots.
 */
export const MOCKUP_SPECS: Partial<Record<ProductId, readonly MockupSpec[]>> = {
  mug: [
    {
      ...STUDIO,
      id: "right",
      label: "Right",
      side: "right",
      src: "/mockups/mug-right.webp",
      body: { left: 276, right: 759, top: 221, bottom: 834 },
    },
    {
      ...STUDIO,
      id: "front",
      label: "Front",
      // Handle hidden behind the mug (180 deg): the design centre faces us.
      side: "right",
      src: "/mockups/mug-front.webp",
      body: { left: 272, right: 756, top: 221, bottom: 834 },
      geometry: { diameterMm: 83, handleAngleDeg: 180 },
    },
    {
      ...STUDIO,
      id: "left",
      label: "Left",
      side: "left",
      src: "/mockups/mug-left.webp",
      body: { left: 279, right: 762, top: 221, bottom: 834 },
    },
    {
      id: "lifestyle",
      label: "Lifestyle",
      side: "left",
      src: "/mockups/mug-lifestyle.webp",
      widthPx: 1080,
      heightPx: 1080,
      // Eye-level photo; the handle joins the body at the silhouette (~90 deg).
      body: { left: 322, right: 806, top: 286, bottom: 893 },
      geometry: { diameterMm: 83, handleAngleDeg: 90 },
      mugHeightMm: 96,
      // Measured: base edge 22 px lower at the centre, rim front edge 13 px higher.
      sag: { rim: -13, base: 22 },
      credit: "Canva",
    },
    {
      id: "flatlay",
      label: "Flat lay",
      side: "left",
      src: "/mockups/mug-flatlay.webp",
      widthPx: 1080,
      heightPx: 1080,
      // Shot from above on a desk; the handle joins the body at the silhouette (~90 deg).
      body: { left: 320, right: 782, top: 244, bottom: 835 },
      geometry: { diameterMm: 83, handleAngleDeg: 90 },
      mugHeightMm: 96,
      sag: { rim: -30, base: 22 },
      // Measured on the photo (contrast-stretched): the mug is slightly tilted,
      // so the top edge is level on the right and slopes down on the left, and
      // the base edge is ~10 px higher on the right. The top follows the smooth
      // rim, not the tight corner rounding (a printed wrap has square corners).
      outline: {
        top: [
          [322, 276],
          [330, 268],
          [340, 262],
          [380, 259],
          [420, 255.5],
          [460, 251.5],
          [500, 248],
          [540, 245],
          [580, 244],
          [700, 244],
          [740, 245],
          [782, 248],
        ],
        bottom: [
          [325, 826],
          [340, 829],
          [375, 833],
          [450, 834.5],
          [550, 835],
          [650, 832],
          [725, 827],
          [775, 820],
          [782, 816],
        ],
      },
      credit: "Canva",
    },
  ],
};
