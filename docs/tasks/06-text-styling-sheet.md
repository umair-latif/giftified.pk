# 06 — Text styling sheet

> **Scope reduced:** the lead's selection bar (`src/features/editor/components/selection-bar.tsx`)
> already has the font picker, text colour, bold/italic/underline, copy and delete. This task is now the
> **"More" sheet** for text: editing the words, outline, alignment, and the self-hosted
> font files (adding a font to `src/config/fonts.ts` makes it appear in the bar's picker too).
> Open it from a new "More" / "Aa" button at the start of the selection bar (one small edit there).

**Branch:** `feat/text-sheet` · **Suggested owner:** any AI assistant — a second Claude session, Cursor or Gemini (lead reviews)

## Goal

When a text layer is selected, a "More" bottom sheet lets the customer change the words,
alignment and an outline. (Font, colour and bold/italic/underline are already in the selection bar.)

## You may edit

- `src/features/editor/components/text-sheet.tsx` (new) and small new UI components under
  `src/features/editor/components/`
- `src/components/ui/` (generic Sheet / Swatch components)
- `src/features/editor/components/design-editor.tsx` — only to mount the sheet
- `src/features/editor/components/selection-bar.tsx` — only to add the "More" button that opens it
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
- Outline: off / thin / thick (`strokeWidthMm` 0 / 0.4 / 0.8) + outline colour (reuse the swatches in `src/config/colours.ts`).
- Touch targets ≥ 44 px.

## Acceptance criteria

- E2E: select text → edit the words, alignment, outline → undo restores each step.
- Fonts don't load until the sheet is opened (check Network tab / e2e request assertion).
- `pnpm check` + `pnpm e2e` green.
