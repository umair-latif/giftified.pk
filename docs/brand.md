# Brand: DesignBanana (v7 theme)

Brand decision and name history: the claude.ai
project note `brand/designbanana-brand-decision.md`; visual boards in the "DesignBanana Brand Sheet"
canvas. Tokens live in `src/app/globals.css` (`@theme`), fonts in `src/app/fonts.ts`.

**Theme rules (Oct 2026 refinement):** keep the neo-brutalist "sticker" look, but only the important
things get the full treatment. Source: `designbanana-theme-handoff.md` (UX review of 15 Oct 2026).

**Colour: 8 tokens, one job each.** Don't hard-code hex values in components.

| Token         | Hex       | Use for                                                | Never for                                   |
| ------------- | --------- | ------------------------------------------------------ | ------------------------------------------- |
| `ink`         | `#121212` | All text, outlines, the hard shadow                    | —                                           |
| `action`      | `#FFE135` | Primary buttons, the current step in a flow            | Banners, backgrounds, notices, decoration   |
| `brand`       | `#14B8A6` | Hero, feature bands (large surfaces, ink text)         | Text; white text on it (2.5:1)              |
| `highlight`   | `#FF3D8B` | Logo "banana", New/Sale badges, cart count, Tip labels | Body text, prices, large areas; text < 24px |
| `accent-text` | `#0F766E` | Prices, text links, the focus ring                     | Large backgrounds                           |
| `deep`        | `#0B3B37` | Footer, trust/help panels, section headings            | —                                           |
| `soft`        | `#DDF4EF` | Info panels, delivery estimate, hover tints            | —                                           |
| `page`        | `#F3FBF9` | Page background                                        | —                                           |
| white         | `#FFFFFF` | Cards, inputs, secondary buttons                       | —                                           |

Text on `deep`: `on-deep` (`#F0FDFA`, 11.9:1) for main text, `on-deep-muted` (`#99F6E4`, 9.8:1) for
secondary text. Greys are ink at an opacity (`text-ink/65` muted, `border-ink/25` hairlines), never
`zinc-*`. Announcement bars are `ink` with white text, never yellow. Selected options (chips, tabs,
toggles) are `bg-ink text-white`. Status colours (red danger, amber warning, emerald OK) stay Tailwind's.

**Type: 7 styles.** Display (`type-display`, Bagel 48/32 px: home hero, 404), Section title
(`type-section`, Bagel 28/24 px: page titles via `PageTitle`, home sections, shelves), Card title
(`type-card-title`, Space Grotesk 700 20/17 px), Button/label (`text-base font-semibold`), Body
(`text-base`, 16/24), Small (`text-sm`, 14/20), Eyebrow (`type-eyebrow`, 12 px 700 uppercase).
Bagel Fat One only at 24 px or larger and only for page/section titles (plus the 24 px footer
wordmark); headings don't get it automatically. No 500 weight, no new sizes. Urdu script: wrap it in
`lang="ur" dir="rtl"`; `:lang(ur)` switches to `--font-urdu` (Noto Nastaliq Urdu, line-height 2),
which still has to be self-hosted the first time Urdu copy ships.

**Fonts:** Space Grotesk (400/600/700; the 500 file is loaded but not for body text) and Bagel Fat
One (one weight, `font-synthesis: none`). Both OFL, self-hosted, Latin subset, in `src/app/fonts.ts`.
Editor/print fonts are a separate list (`src/config/fonts.ts`).

**Logo:** founder's PNG in `public/brand/designbanana-logo.png` (2×, 352×72), used by
`components/ui/wordmark.tsx`. Footer (dark teal) uses the text version `WordmarkOnDark`. Replace
with the SVG when it arrives.

**Name and tagline:** **DesignBanana** (one word, two capitals) and the tagline **Kuch khaas banao**
(sentence case, "khaas" with a double a, no exclamation mark), kept in `SITE.tagline`. Browser title on
the home page: `DesignBanana – Kuch khaas banao`; other pages: `<Page> · DesignBanana`. The tagline also
sits under the logo in the footer and as the label above the home headline. No English tagline, and no
"on your phone" in copy: the site is phone-first but works on any device.

**Shape:** radius 16 px (`rounded-2xl`) for cards, buttons, panels; 12 px (`rounded-xl`) for inputs,
selects and image tiles inside cards; `rounded-full` for chips, filters, badges. Nothing else.
Outline (always ink): 3 px on buttons, cards, panels; 2 px on chips, inputs, badges, image tiles.
**One shadow:** `shadow-hard` (4 px 4 px 0 ink). Only primary buttons wear it at rest; secondary
buttons, chips and tappable cards get it on hover / keyboard focus (`lift`, `card-pop`). No blurred
shadows, no 6 px variant, no glow. Sheets and popovers use an ink top border instead of a shadow.

**States:** pressed (`press`) slides 4 px into the shadow and drops it; 120 ms ease-out on transform
and shadow, off under `prefers-reduced-motion`. Focus: one global ring (`:focus-visible`, 3 px
`accent-text`, offset 4 px; `on-deep-muted` inside `.on-dark` surfaces) — never add
`focus-visible:outline-none` or `focus-visible:ring-*` in components. Disabled: `page` fill, ink
outline at 40%, no shadow, `cursor-not-allowed`.

**Customer-facing name:** "DesignBanana" / "DesignBanana.pk" on every page, email and the vendor PDF
(no "Giftified" anywhere a customer or vendor reads it). No legal-registration or street-address text
until the business is registered; partner workshops are described as "in and around Gujrat and
Jhelum". Internal names stay: storage keys and print font names (`giftified:*`, "Giftified …") must
not change. The email sender name comes from `EMAIL_FROM` on the host.

## UI standards (task 25)

One pattern per idea, so new pages don't pick a random existing one.

- **Buttons:** always `buttonClass()` (`components/ui/button.tsx`): `rounded-2xl`, **`h-12`**, 3 px
  ink outline. `primary` = banana yellow + hard shadow (one per screen), `secondary` = white, outline
  only. `compactButtonClass()` is the 44 px version for cards and sheets; `chipClass` the 36 px pill;
  `iconButtonClass` the round icon button. `BUTTON_SKIN` gives the colours for one-off sizes (the
  header "Next"). Disabled = `page` fill and faded outline, never just `opacity`.
- **Content card:** the `card` utility (`globals.css`): white, 3 px ink outline, `rounded-2xl`, flat.
  Add `card-pop` only when the whole card is a link (shadow on hover/focus, press on tap). "Coming
  soon" cards add `border-dashed!`. Accordions use the same frame. Alert banners are not cards.
- **Inputs:** `inputClass()` (`features/checkout/components/field.tsx`): `h-12 rounded-xl border-2
border-ink`, red when invalid.
- **Accordion:** `components/ui/disclosure.tsx` (FAQ, product Details). Don't hand-roll `<details>`.
- **Text colour:** body `text-ink`, section headings `text-deep`. `text-ink/65`–`/70` is the deliberate
  _muted_ tier (captions, help text, meta); prices and links `text-accent-text`.
- **Touch targets:** two named tiers. **Primary 44 px** (buttons, header actions, tab/toolbar buttons,
  standalone controls). **Secondary 36 px** only for dense in-row controls: the selection bar's text
  tools, quantity steppers, colour swatches, sheet close, and the editor's Centre/Straighten chips.
  Link lists are tighter on purpose: footer links 32 px, phone-menu rows 40 px (stacked text links,
  full-width rows).
- **Warnings (photo quality):** amber-50 background, `amber-900` text, `amber-200` ring (as
  `print-quality-badge.tsx`). Never `amber-700/800` text.
- **Danger:** text `red-700`; blocking banners `red-800` on `red-50` with `red-200` ring; fills/dots `red-700`.
