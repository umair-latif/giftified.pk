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

## UI standards (task 25)

One pattern per idea, so new pages don't pick a random existing one.

- **Primary button:** `bg-brand-600` (hover/active `-700`), white text, `rounded-full`, **`h-12`**
  (the compact header "Next" pill is the one exception, `h-9`). **Disabled = same pill, desaturated:**
  `disabled:bg-brand-300 disabled:hover:bg-brand-300` (never grey, never just `opacity`).
- **Content card:** `rounded-2xl bg-white ring-1 ring-zinc-200` (use `ring-1`, not `border`, for the
  hairline). Accordions use the same frame. Alert banners (`rounded-lg`) and inputs are not cards.
- **Accordion:** `components/ui/disclosure.tsx` (FAQ, product Details). Don't hand-roll `<details>`.
- **Text colour:** body `text-ink`, headings `text-brand-900`. `text-zinc-500/600` is the deliberate
  _muted_ tier (captions, help text, meta). Transactional pages (cart, checkout, order, track) share
  this with marketing pages; avoid `zinc-700/800/900` for new body/heading text.
- **Touch targets:** two named tiers. **Primary 44 px** (buttons, header actions, tab/toolbar buttons,
  standalone controls). **Secondary 36 px** only for dense in-row controls: the selection bar's text
  tools, quantity steppers, colour swatches, sheet close, and the editor's Centre/Straighten chips.
- **Warnings (photo quality):** amber-50 background, `amber-900` text, `amber-200` ring (as
  `print-quality-badge.tsx`). Never `amber-700/800` text.
- **Danger:** text `red-700`; blocking banners `red-800` on `red-50` with `red-200` ring; fills/dots `red-700`.
