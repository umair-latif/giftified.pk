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
  widthPx: 1080,
  heightPx: 1080,
  printLeft: "31.76%",
  printTop: "21.3%",
  printWidth: "36.48%",
} as const;
