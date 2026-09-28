# Brand (first version — can change)

Source: the founder's brand sheet (Giftified.pk Brand Identity Guidelines). Colours were
sampled from the swatches in the image; the hex codes printed on the sheet don't match them.
Tokens live in `src/app/globals.css` (`@theme`), fonts in `src/app/fonts.ts`.

| Role              | Token                   | Hex       | Use                                        |
| ----------------- | ----------------------- | --------- | ------------------------------------------ |
| Personalized Teal | `brand-500`             | `#2B8496` | Logo, accents                              |
| Button teal       | `brand-600` / `-700`    | `#237585` | Buttons (white text 5.3:1), pressed `-700` |
| Creative Mint     | `mint-300` / `mint-500` | `#9DDFBC` | Backgrounds, highlights; `.pk` in the logo |
| Seasonal Magenta  | `magenta`               | `#C5448A` | Occasion badges, sales                     |
| Joyful Yellow     | `sunny`                 | `#FED847` | Highlights (never text on white)           |
| Text Dark Gray    | `ink`                   | `#484847` | Secondary headings                         |
| Cream             | `cream`                 | `#FBF8EC` | Page background                            |

Accessibility: text on teal must use `brand-600` or darker; `brand-500` with white is 4.3:1
(too low for small text). Mint and yellow are backgrounds, not text colours.

**Fonts:** Poppins (400/500/600) for text; Nunito ExtraBold for headings (`font-display`) as a free
stand-in for Halyard Rounded, which is a commercial font. Both are OFL, self-hosted, Latin subset.
These are site fonts only; the editor/print fonts are a separate list (`src/config/fonts.ts`).

**Logo:** text wordmark (`components/ui/wordmark.tsx`) until an SVG logo (with the Urdu
"تحفہ" + gift box) is supplied. Put it in `public/brand/` as SVG.

**Photography:** mint/teal/yellow backgrounds, real people, kraft-paper gift boxes (see sheet).
