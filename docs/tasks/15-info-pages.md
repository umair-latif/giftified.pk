# 15 — Help and info pages

**Branch:** `feat/info-pages` · **Suggested owner:** any AI assistant; **text from the founder** ·
**Needs:** A0 merged

## Goal

The pages every shop needs, linked from the footer.

## You may edit

- `src/app/(store)/help/`, `about/`, `contact/`, `privacy/`, `terms/` (new pages)
- `src/features/info/` (new: FAQ accordion with `<details>`, no JS library)
- `tests/e2e/info.spec.ts`

## Do not touch

`src/components/site/*` (footer already links these routes), `src/config/site.ts` (A0: WhatsApp
number, email, social links — read from it).

## Pages

- **Help / FAQ:** delivery times and cost, how COD works (we call first), photo quality tips
  (what "too blurry" means), how to track an order, reprint policy, cancellations.
- **Contact:** WhatsApp button (`https://wa.me/<number>`), email, hours.
- **About:** short story, Gujrat/Sialkot printing partners, brand values from the brand sheet.
- **Privacy:** build it from **`docs/content/privacy.md`** — the founder's approved wording. Keep the
  text as written (headings/formatting are yours); fill only the `TODO(founder)` parts if the founder
  has supplied them, otherwise leave them marked. Do not add claims that aren't in that file. **Terms:** orders, COD, reprints, content rules
  (no copyrighted logos/characters), liability.

Write clear draft text marked `TODO(founder)` where facts are needed (days, prices, policies); the
founder replaces it. Legal pages are drafts until reviewed by someone qualified.

## Acceptance criteria

Pages render at 360 px with the site header/footer, have metadata titles, FAQ opens/closes without
JS; `pnpm check` + `pnpm e2e` green.
