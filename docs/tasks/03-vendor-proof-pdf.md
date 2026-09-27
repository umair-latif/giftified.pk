# 03 — VendorProof.pdf builder

**Branch:** `feat/vendor-proof` · **Suggested owner:** a second Claude Code session

## Goal

Implement `buildVendorProof(input) → PDF bytes`: a standardised one-page A4 proof the
Gujrat print vendor can follow without questions.

## You may edit

- `src/server/pdf/` (implementation files; keep `index.ts` exporting `buildVendorProof`)
- `tests/unit/vendor-proof.test.ts`, `tests/fixtures/pdf/*`
- `scripts/make-sample-proof.ts` (writes a sample PDF for visual review)

## Do not touch

`src/server/pdf/types.ts`, `src/types/*`.

## Contract

`VendorProofInput` / `BuildVendorProof` in `src/server/pdf/types.ts`.
Use `tests/fixtures/design-mug-preview.png` as the print image stand-in.

## Requirements

- Library: `pdf-lib` (pure JS, works in serverless). Embed one font; no network fetches.
- Layout (A4 portrait, big readable type — it will be printed and read on a factory floor):
  1. Header: "Giftified.pk — Production Proof", order ID large, date.
  2. Product block: product name, colour, size, quantity.
  3. The print image on a checkerboard (shows transparency), with a **dimensioned outline**
     (width × height in mm) and a 10 mm scale bar.
  4. Placement: text from `print.placement` + offsets in mm, plus a simple diagram
     (for the mug: unrolled wrap with "handle" marks at both ends).
  5. Optional mockup image.
  6. Footer: "Print at 100% · 300 DPI · colours sRGB", customer **city only**, notes.
- Must not contain customer phone or street address.
- Output < 2 MB for a typical order (downscale the embedded preview; the full PNG is attached separately).

## Acceptance criteria

- Unit test: builds from fixtures, output starts with `%PDF`, contains the order ID text,
  size within limit, and never contains a phone-number pattern.
- `scripts/make-sample-proof.ts` output reviewed by the founder with one real vendor.
- `pnpm check` green.
