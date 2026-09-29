# 07 — 300 DPI print renderer (lead)

**Branch:** `feat/print-renderer` · **Owner:** Lead (Claude)

## Goal

`renderPrintFile(doc, { dpi = 300 })` → transparent sRGB PNG of exactly the print area
(mug: 2551 × 1051 px), rendered on the server from the saved `DesignDocument` and the
**original** uploaded images.

## Scope

- `src/server/print/`, `tests/unit/print-*.test.ts`, font registration shared with `src/config/fonts.ts`.
- Fabric in Node (`fabric/node`) with `@napi-rs/canvas` or `canvas`; zoom = dpi / 25.4.
- Golden-image tests against `tests/fixtures/design-mug.json`.
- Resolve image URLs to originals in storage (never the compressed previews).
- Crops are stored in preview pixels: scale `cropX/cropY/width/height` by
  `sourceWidthPx / previewWidthPx` and divide `scaleX/scaleY` by it (see `src/types/design.ts`).

## What was built (in review)

```ts
import { renderPrintFile } from "@/server/print"; // server-only

const file = await renderPrintFile(design, {
  dpi: 300, // default
  // Bytes of the ORIGINAL upload (from storage). Required when the design has images.
  resolveAsset: (assetId) => storage.getOriginal(assetId),
});
// file.png: Uint8Array — store it and put the URL on the order (`_print_png_url`).
```

- **Output:** transparent RGBA PNG, exactly `printPixelSize(widthMm, heightMm, dpi)`
  (mug @ 300 DPI = 2551 × 1051), `pHYs` = dpi, tagged `sRGB`, no `bKGD` chunk.
- **Rendering:** `fabric/node` `StaticCanvas` (node-canvas + jsdom) sized to the pixel
  size, viewport zoom `dpi / 25.4` over the mm scene. Canvas background/overlay are
  dropped (print files are artwork only); object caching is disabled so large objects
  are never downsampled by Fabric's cache size limits.
- **Images:** every image must be an `asset:<id>` / `assetId`; anything else throws
  (never print from previews or URLs). Originals are decoded with `sharp` (JPEG, PNG,
  WebP; applies EXIF orientation, converts ICC profiles to sRGB) and drawn in place of
  the preview. Crop/size are rescaled from preview px to original px by
  `toOriginalGeometry` (`original-image.ts`, pure). Originals whose pixel size doesn't
  match `sourceWidthPx/sourceHeightPx` are rejected ("wrong file?").
- **Fonts:** since task 16 `server-fonts.ts` derives from `src/config/fonts.ts` — the
  same OFL files (Liberation Sans/Mono, Gelasio, Poppins, Playfair, Caveat, Noto Nastaliq
  Urdu) the browser editor loads as WOFF2, under the same "Giftified …" family names, real
  faces only. Old device stacks (`Arial, …`) are mapped by `features/editor/fonts/migrate.ts`.
  Unknown fonts throw. To add a font: TTFs in `fonts/<dir>/`, an entry in `FONTS`, then
  `python3 scripts/build-fonts.py` and re-record the parity test (see
  [16](16-font-parity.md)).
- **Deploy note:** fonts are read from `<cwd>/src/server/print/fonts` (override with
  `PRINT_FONTS_DIR`). The route/job that calls the renderer (task 08) must add them to
  the function bundle, e.g. `outputFileTracingIncludes: { "/api/jobs/*": ["./src/server/print/fonts/**"] }`.
- **Try it:** `pnpm print:sample` → `out/print-sample.png` (fixture text + a generated photo).
- **Tests:** `tests/unit/print-*.test.ts` — size, pHYs, sRGB, transparent corners, text ink
  only inside the text objects' boxes (in their colours), crop/scale of an original with
  coloured quadrants, missing asset / wrong-size original / non-asset image errors,
  preview→original geometry, font coverage and real font metrics.

### Open

- Phones don't have Arial/Georgia/Courier New, so the editor preview may wrap text
  differently from the print. Fix in task 06: self-host the same font files in the
  browser and here.
