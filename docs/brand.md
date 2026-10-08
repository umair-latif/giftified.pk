# Brand: DesignBanana (v7 theme)

Branch `feat/designbanana-theme`. The previous Giftified brand (teal `#2B8496`, Poppins/Nunito) is
on `main`; to go back, don't merge this branch. Brand decision and name history: the claude.ai
project note `brand/designbanana-brand-decision.md`; visual boards in the "DesignBanana Brand Sheet"
canvas. Tokens live in `src/app/globals.css` (`@theme`), fonts in `src/app/fonts.ts`.

| Role          | Token                | Hex       | Use                                                 |
| ------------- | -------------------- | --------- | --------------------------------------------------- |
| Teal          | `brand-500`          | `#14B8A6` | Big shapes: hero, banners, step numbers             |
| Deep teal     | `brand-600` / `-700` | `#0F766E` | Buttons (white text 5.5:1), links; pressed `-700`   |
| Mint paper    | `cream`, `mint-*`    | `#F3FBF9` | Page background; mint tints for image wells         |
| Pink          | `magenta`            | `#FF3D8B` | "banana" in the logo, badges, stickers (black text) |
| Banana yellow | `sunny`              | `#FFE135` | Hero button, highlights, "New" badges (black text)  |
| Ink           | `ink`                | `#121212` | Text, outlines, hard shadows                        |

Accessibility: pink and yellow always take **black** text (white on pink is 3.3:1). White text only
on `brand-600` or darker. `brand-500` is a background colour; text on it is `ink`.

**Fonts:** Space Grotesk (400/500/600) for text; Bagel Fat One for the logo and headings
(`font-display`, one weight only, so headings never ask for bold — `font-synthesis: none`). Small UI
headings with `font-semibold` (editor header, sheet titles) stay in Space Grotesk. Both OFL,
self-hosted, Latin subset. Editor/print fonts are a separate list (`src/config/fonts.ts`).

**Logo:** founder's PNG in `public/brand/designbanana-logo.png` (2×, 352×72), used by
`components/ui/wordmark.tsx`. Footer (dark teal) uses the text version `WordmarkOnDark`. Replace
with the SVG when it arrives.

**Name and tagline:** **DesignBanana** (one word, two capitals) and the tagline **Kuch khaas banao**
(sentence case, "khaas" with a double a, no exclamation mark), kept in `SITE.tagline`. Browser title on
the home page: `DesignBanana – Kuch khaas banao`; other pages: `<Page> · DesignBanana`. The tagline also
sits under the logo in the footer and as the label above the home headline. No English tagline, and no
"on your phone" in copy: the site is phone-first but works on any device.

**Style:** one outline everywhere: **3 px black** on cards and buttons, 2 px on inputs and small
controls. Hard black shadows (4 px, 6 px on the hero image) only on things you tap: buttons, product
cards and design tiles. Info cards stay flat. The editor canvas and toolbars stay calm. The occasion
tiles keep their solid pink/yellow look with no outline.

**Not renamed yet (later PR):** legal operator name on /terms, vendor PDF, emails (sender domain),
storage keys and print font names (`giftified:*`, "Giftified …" — internal, must not change).

## UI standards (task 25)

One pattern per idea, so new pages don't pick a random existing one.

- **Buttons:** always `buttonClass()` (`components/ui/button.tsx`): `rounded-2xl`, **`h-12`**, 3 px
  black outline, 4 px hard shadow that presses in on tap. `primary` = deep teal + white text,
  `secondary` = white, `sunny` = banana yellow (on coloured backgrounds: hero, footer). The compact
  header "Next" button is the one exception (`h-9`, 2 px outline). **Disabled = same button,
  desaturated:** `bg-brand-300`, no shadow (never grey, never just `opacity`).
- **Content card:** the `card` utility (`globals.css`): white, 3 px black outline, `rounded-2xl`.
  Add `card-pop` (4 px hard shadow) only when the whole card is a link. "Coming soon" cards add
  `border-dashed!`. Accordions use the same frame. Alert banners (`rounded-lg`) are not cards.
- **Inputs:** `inputClass()` (`features/checkout/components/field.tsx`): `h-12 rounded-xl border-2
border-ink`, red when invalid.
- **Accordion:** `components/ui/disclosure.tsx` (FAQ, product Details). Don't hand-roll `<details>`.
- **Text colour:** body `text-ink`, headings `text-brand-900`. `text-zinc-500/600` is the deliberate
  _muted_ tier (captions, help text, meta). Transactional pages (cart, checkout, order, track) share
  this with marketing pages; avoid `zinc-700/800/900` for new body/heading text.
- **Touch targets:** two named tiers. **Primary 44 px** (buttons, header actions, tab/toolbar buttons,
  standalone controls). **Secondary 36 px** only for dense in-row controls: the selection bar's text
  tools, quantity steppers, colour swatches, sheet close, and the editor's Centre/Straighten chips.
  Link lists are tighter on purpose: footer links 32 px, phone-menu rows 40 px (stacked text links,
  full-width rows).
- **Warnings (photo quality):** amber-50 background, `amber-900` text, `amber-200` ring (as
  `print-quality-badge.tsx`). Never `amber-700/800` text.
- **Danger:** text `red-700`; blocking banners `red-800` on `red-50` with `red-200` ring; fills/dots `red-700`.
