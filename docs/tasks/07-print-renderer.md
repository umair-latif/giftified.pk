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
