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
 * A photographed flat garment (T-shirt). The design is a rectangle (the print
 * area) laid on the chest: `tl`, `tr` and `bl` are the corners of that
 * rectangle on the photo, in photo pixels, so a tilted or folded shirt works
 * too. Screen-only: the size on the photo assumes a body width of about 500 mm.
 *
 * TODO(vendor): confirm the real garment width and the print's distance from
 * the collar; until then the placement is a visual estimate (docs/ops/print-specs.md).
 */
export interface GarmentMockupSpec {
  id: string;
  label: string;
  src: string;
  widthPx: number;
  heightPx: number;
  /**
   * Corners of the print area on the photo. `br` defaults to the parallelogram
   * corner (tr + bl - tl); give it when the photo has perspective.
   */
  quad: { tl: Point; tr: Point; bl: Point; br?: Point };
  /**
   * How the print follows the cloth: for each edge, px it sits off the straight
   * line between its corners, sampled evenly along the edge (first and last are
   * the corners, so 0) and smoothed between samples. `top`/`bottom` move up/down
   * (+y is down), `left`/`right` move sideways (+x is right). Measured from a
   * placeholder render, so folds and ripples are followed.
   */
  edges?: {
    top?: number[];
    bottom?: number[];
    left?: number[];
    right?: number[];
  };
  /** Per-photo overrides of the ink look (a smooth photo needs less, a grainy one more). */
  ink?: Partial<InkSettings>;
  /**
   * Show only a square part of the photo (a close-up of the print and fabric).
   * `x`, `y`, `size` are in photo pixels; the result is `outPx` wide. Keep it
   * square, like the photo, so the gallery frame does not change shape.
   */
  crop?: { x: number; y: number; size: number; outPx: number };
  credit: string;
}

/** How the ink sits on the cloth (see INK in compose-garment.ts for what each does). */
export interface InkSettings {
  shadow: number;
  grain: number;
  weave: number;
  opacity: number;
  ridgeDropout: number;
  warp: number;
}

export type Point = readonly [x: number, y: number];

/** Any preview photo: the mug wrap or a flat garment. */
export type ProductMockupSpec = MockupSpec | GarmentMockupSpec;

export function isGarmentSpec(s: ProductMockupSpec): s is GarmentMockupSpec {
  return "quad" in s;
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
export const MOCKUP_SPECS: Partial<
  Record<ProductId, readonly ProductMockupSpec[]>
> = {
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
  // White tee photos supplied by the founder (1080 x 1080). Each `quad` is the
  // 300 x 400 mm print rectangle the founder drew on the photo. The first is
  // the editor's own background (no guides), so the preview matches what the
  // customer designed on.
  tshirt: [
    {
      id: "front",
      label: "Front",
      src: "/mockups/tshirt-front.webp",
      widthPx: 1080,
      heightPx: 1080,
      quad: { tl: [343, 230], tr: [737, 230], bl: [343, 755] },
      credit: "Founder-supplied",
    },
    {
      id: "studio",
      label: "Studio",
      src: "/mockups/tshirt-studio.webp",
      widthPx: 1080,
      heightPx: 1080,
      quad: { tl: [343, 230], tr: [737, 230], bl: [343, 755] },
      credit: "Founder-supplied",
    },
    {
      id: "model",
      label: "Model",
      src: "/mockups/tshirt-model.webp",
      widthPx: 1080,
      heightPx: 1080,
      // Measured against the founder's reference render of this photo
      // (99.5% overlap with the placeholder): slight perspective, and the edges
      // follow the cloth (top bows up, left bulges in, a fold on the right).
      quad: {
        tl: [466.3, 405.8],
        tr: [735.0, 410.1],
        bl: [469.4, 766.5],
        br: [720.9, 766.0],
      },
      edges: {
        top: [
          0.0, -6.0, -7.6, -8.8, -9.6, -10.7, -11.7, -12.2, -12.9, -13.1, -13.0,
          -12.7, -12.7, -12.4, -12.2, -12.2, -11.7, -11.3, -10.7, -9.7, -8.6,
          -7.6, -6.4, -3.4, 0.0,
        ],
        bottom: [
          0.0, 3.2, 3.3, 3.4, 3.6, 3.8, 4.0, 4.1, 4.0, 3.9, 3.9, 3.9, 3.9, 4.1,
          3.9, 3.8, 3.5, 3.5, 3.8, 3.8, 3.7, 3.7, 3.6, 3.7, 0.0,
        ],
        left: [
          0.0, -2.0, -0.3, 2.3, 5.1, 4.7, 5.0, 5.3, 5.9, 6.6, 7.4, 7.9, 9.0,
          10.5, 11.6, 11.8, 11.0, 9.5, 7.1, 4.5, 2.6, 0.8, -0.8, -1.9, 0.0,
        ],
        right: [
          0.0, 4.8, 6.1, 5.7, 4.5, 3.1, 1.5, 0.6, -0.6, -2.6, -2.0, 2.4, 4.4,
          2.9, 1.2, -0.1, -0.8, -1.2, -0.6, 0.1, 1.0, 2.5, 3.4, 5.8, 0.0,
        ],
      },
      // Fitted to the reference render (colour within ~2 levels, same grain):
      // crisp colour, light shading, fine weave.
      ink: {
        shadow: 0.3,
        grain: 0,
        opacity: 0.98,
        weave: 0.013,
        warp: 0,
        ridgeDropout: 0.1,
      },
      credit: "Founder-supplied",
    },
    {
      id: "torso",
      label: "Torso",
      src: "/mockups/tshirt-torso.webp",
      widthPx: 1080,
      heightPx: 1080,
      // The man leans slightly: the body axis is ~1.7 degrees off vertical.
      quad: { tl: [335, 236], tr: [729, 224], bl: [351, 761] },
      credit: "Founder-supplied",
    },
    {
      id: "pointing",
      label: "Pointing",
      src: "/mockups/tshirt-pointing.webp",
      widthPx: 1080,
      heightPx: 1080,
      // The rectangle runs off the bottom of the photo (the shirt is cropped).
      quad: { tl: [368, 760], tr: [762, 760], bl: [368, 1285] },
      credit: "Founder-supplied",
    },
    {
      id: "closeup",
      label: "Close-up",
      src: "/mockups/tshirt-studio.webp",
      widthPx: 1080,
      heightPx: 1080,
      quad: { tl: [343, 230], tr: [737, 230], bl: [343, 755] },
      // The chest at 1.5x: ink and fabric grain up close.
      crop: { x: 300, y: 290, size: 480, outPx: 720 },
      credit: "Founder-supplied",
    },
  ],
};
