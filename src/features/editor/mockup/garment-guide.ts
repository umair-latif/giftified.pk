/**
 * Editor garment photo. Screen-only geometry: the fractions below place the
 * editable canvas exactly over the "designable area" marked on the supplied
 * photo (measured on the 1080 x 1080 image: x 343-736, y 230-755, which is the
 * 300 x 400 mm ratio). They are NOT an approved physical collar offset.
 * TODO(vendor): calibrate against the confirmed garment/print placement.
 * Back is retained as an asset; task 27 remains front-only.
 */
export const TSHIRT_EDITOR_GUIDE = {
  src: "/mockups/tshirt-editor-front.webp",
  /** Editor photo per garment colour (same geometry). */
  srcByColour: {
    black: "/mockups/tshirt-editor-front-black.webp",
  } as Record<string, string>,
  widthPx: 1080,
  heightPx: 1080,
  printLeft: "31.76%",
  printTop: "21.3%",
  printWidth: "36.48%",
  /**
   * Desktop: show only this part of the photo (fractions of its size), centred
   * on the print area, which then fills ~82% of the stage height.
   */
  desktopView: { left: 0.159, top: 0.16, width: 0.682, height: 0.593 },
} as const;

/**
 * Hoodie editor photo: the founder's photo cut out and zoomed to the chest
 * (square crop x 92-952, y 83-943 of the 1080 x 1080 photo), so the 300 x 220 mm
 * print area the founder marked (x 320-725, y 365-662) is large on a phone.
 * Screen-only geometry, like the T-shirt's. TODO(vendor): calibrate.
 */
export const HOODIE_EDITOR_GUIDE = {
  src: "/mockups/hoodie-editor-front.webp",
  srcByColour: {
    grey: "/mockups/hoodie-editor-front-grey.webp",
  } as Record<string, string>,
  widthPx: 1080,
  heightPx: 1080,
  printLeft: "26.51%",
  printTop: "32.79%",
  printWidth: "47.09%",
  /** Desktop window (see the T-shirt's): the print fills ~65% of the width. */
  desktopView: { left: 0.141, top: 0.224, width: 0.72, height: 0.554 },
} as const;

/** The editor garment photo for a product, or null to show the plain print area (mug). */
export function editorGuideFor(productId: string) {
  if (productId === "tshirt") return TSHIRT_EDITOR_GUIDE;
  if (productId === "hoodie") return HOODIE_EDITOR_GUIDE;
  return null;
}
