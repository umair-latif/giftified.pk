# 17 — Photo frames ("Crop & shape")

**Branch:** `feat/photo-frames` · **Owner:** Lead

The crop sheet becomes **Crop & shape**: chips Original · Circle · Rounded · Heart · Arch · Star ·
Polaroid. The photo fills the shape and moves/zooms inside it; selection bar adds **Replace photo**.
Polaroid = white frame with thicker bottom, optional caption, slight tilt, drop shadow. Shapes are
serialised in `design.json` (clip paths) and render identically in the 300 DPI renderer; the DPI check
uses the visible part only. Soft shadows allowed on mugs; on apparel use a solid offset shadow or none
(confirm with vendors). Unit tests for shape geometry; renderer test for each shape; e2e for the sheet.

## Playing-card frames (2 Nov 2026)

Chips **Heart card** and **Diamond card** (founder's artwork, dark red). The photo fills the card's
window (463 × 834 artwork px, so a fixed 0.555 aspect); the white card, inner frame, pips and the
customer's **card letter** are drawn by the image's own render (`engine/card-frame.ts`), like the
polaroid, so they move/rotate/print with the photo and the print renderer draws the same thing.

- **Letter:** typed once in the crop sheet ("Card letter", A–Z/0–9, up to 2, capitalised; new cards
  start with "K"). Drawn top-left above the pip and again turned 180° bottom-right, in
  `Giftified Serif` bold (Gelasio, same file in browser and print), sized so capitals match a fixed
  height and narrowed for "10"/"MW". Colour = the artwork red per suit. Stored as `frameLetter`.
- **Fit:** when a card is first chosen the photo shrinks so the whole card fits inside the print
  area's safe zone (the card is ~1.65× wider and ~1.29× taller than the photo).
- **Artwork:** vector, traced from `scripts/card-frames/card-heart.png` / `card-diamond.png` by
  `python3 scripts/build-card-frames.py` (needs `potracer`) into `engine/card-frame-art.ts`. Only
  the top-left quarter of the inner frame and the top-left pip are traced; symmetry is applied when
  drawing. To change the artwork: replace the PNGs (same layout), re-run the script.
