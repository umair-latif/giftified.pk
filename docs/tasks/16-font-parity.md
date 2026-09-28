# 16 — Editor ↔ print font parity

**Branch:** `fix/font-parity` · **Owner:** Lead

The editor uses the phone's fonts (Arial is missing on Android), the print renderer uses bundled
Liberation/Gelasio, so text can wrap and size differently in print. Load the **same font files** in
the browser editor (`@font-face` from `/fonts/print/…`, only when the editor opens), make
`src/config/fonts.ts` list only fonts that exist on both sides, wait for fonts before first render,
and add a test that renders the fixture in the browser and on the server and compares text boxes.
