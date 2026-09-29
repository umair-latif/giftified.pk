# 16 — Editor ↔ print font parity

**Branch:** `fix/font-parity` · **Owner:** Lead

The editor uses the phone's fonts (Arial is missing on Android), the print renderer uses bundled
Liberation/Gelasio, so text can wrap and size differently in print. Load the **same font files** in
the browser editor (`@font-face` from `/fonts/print/…`, only when the editor opens), make
`src/config/fonts.ts` list only fonts that exist on both sides, wait for fonts before first render,
and add a test that renders the fixture in the browser and on the server and compares text boxes.

## Done (in review)

- **One font list, same files on both sides.** `src/config/fonts.ts` is the single source: each
  font has a unique family name ("Giftified Sans", "Giftified Serif", "Giftified Mono",
  "Giftified Poppins", "Giftified Playfair", "Giftified Caveat", "Giftified Nastaliq"), its folder
  and its REAL faces. The server registers `src/server/print/fonts/<dir>/*.ttf` under that name
  (`server-fonts.ts` derives from the config); the browser loads the same TTFs as WOFF2 from
  `public/fonts/print/<dir>/` (OFL.txt next to each). `python3 scripts/build-fonts.py` rebuilds
  them: Liberation subset to task 06's Latin set (unhinted), a space glyph added to the
  Nastaliq subset (spaces used to fall back to different system fonts), kern pairs with the
  space removed (Chrome never kerns across spaces, Pango did: Playfair lines were 0.4% off),
  then TTF → WOFF2 (lossless).
- **Migration** (`src/features/editor/fonts/migrate.ts`, pure, unit-tested): old stacks →
  new families (`Arial, Helvetica, sans-serif` → `'Giftified Sans', sans-serif`, Georgia → Serif,
  Courier New → Mono, Poppins/Playfair/Caveat/Noto Nastaliq Urdu → the Giftified names),
  numeric weights → normal/bold, and a style the font has no real face for is dropped. Applied by
  the editor restore, the preview render and the print renderer (`preparePrintJson`).
- **Fonts load before the first render, only what the design uses**: `designFontFaces()` →
  `loadFaces()` (FontFace API, 4 s timeout, never throws) in the editor restore, the Preview step
  (re-renders if a font arrives late) and `renderDesignToDataUrl`. The editor also fetches the
  new-text face (Sans bold); the picker/sheet loads one face per font; a toggle fetches its face
  on demand. Any late face re-measures the canvas text (`engine/fonts.ts` `relayoutText`) and
  clears Fabric's glyph-width cache. Shop pages load no fonts (e2e).
- **No faux styles**: Caveat has no italic, Urdu has neither bold nor italic — the selection bar
  disables those toggles and `applyTextStyle` drops them on a font switch; the fake upright copies
  in the server's italic/bold slots are deleted. Poppins/Playfair bold-italic now ship to the browser.
- **Parity test**: `tests/fixtures/font-parity.ts` (samples: 60 mm box, 7 mm text, Latin +
  Urdu) → `tests/e2e/font-parity.spec.ts` (real editor) and `tests/unit/font-parity.test.ts`
  (real print canvas) both compare with `font-parity-expected.json` (recorded from the browser:
  `UPDATE_FONT_PARITY=1 pnpm e2e font-parity`). All 23 font × face combos: identical line breaks,
  widths within 0.0004%.
