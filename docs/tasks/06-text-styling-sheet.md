# 06 — Text styling sheet

**Branch:** `feat/text-sheet` · **Suggested owner:** Intern + Cursor (lead reviews)

## Goal

When a text layer is selected, a bottom sheet lets the customer change the words, font,
colour, bold/italic, alignment and an outline.

## You may edit

- `src/features/editor/components/text-sheet.tsx` (new) and small new UI components under
  `src/features/editor/components/`
- `src/components/ui/` (generic Sheet / Swatch components)
- `src/features/editor/components/design-editor.tsx` — only to mount the sheet
- `src/config/fonts.ts` and `public/fonts/` (self-hosted fonts)
- `tests/e2e/text-sheet.spec.ts`

## Do not touch

`src/features/editor/engine/*`, `src/features/editor/hooks/*` (lead-owned). If you need a new
editor capability, ask the lead to add it to the hook.

## Editor API (already available from `useFabricCanvas`)

- `selection.text` — the selected text's current `TextStyle` (or `null` if not text)
- `applyTextStyle(partial: Partial<TextStyle>)` — one undo step per call
- `setText(value: string)` — replace the words
  See `src/features/editor/engine/text-style.ts` for `TextStyle`.

## Requirements

- Bottom sheet over the toolbar, max 50% of screen height, swipe/tap outside to close.
  The canvas must stay visible above it.
- Text input field (easier than double-tap editing on phones); apply on "Done" or blur,
  not on every keystroke (each apply is an undo step).
- Fonts: 6–8 fonts, self-hosted WOFF2, **subset**, total < 300 KB, loaded only when the sheet
  opens. Include at least one Urdu-capable font (e.g. Noto Nastaliq Urdu — check licence: OFL is fine).
  Every font must be registered for the server print renderer too — list them in `src/config/fonts.ts`.
- Colour swatches (12 print-safe colours) + custom colour input.
- Outline: off / thin / thick (`strokeWidthMm` 0 / 0.4 / 0.8) + outline colour.
- Touch targets ≥ 44 px.

## Acceptance criteria

- E2E: select text → change font, colour, outline → undo restores each step.
- Fonts don't load until the sheet is opened (check Network tab / e2e request assertion).
- `pnpm check` + `pnpm e2e` green.
