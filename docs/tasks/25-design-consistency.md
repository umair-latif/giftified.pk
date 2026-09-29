# 25 — Design-system cleanup: buttons, cards, and colour tokens

**Branch:** `feat/design-tokens` · **Owner:** _unassigned_ · **Needs:** none (independent polish pass)

## Why

A site-wide design-consistency audit (mobile + desktop, read-only, all pages/components) found the
big cross-cutting gaps already — no `hover:`/`focus-visible:` states anywhere, and no consistent
desktop container width for cart/checkout/track/order-status — and those shipped in PR #35. What's
left is smaller-grained but still real drift: the same UI idea (a disabled button, a card, an
accordion, a warning banner) is built a different way in every file that needs it, which means every
new page has a 1-in-4 chance of picking the "wrong" (i.e. inconsistent) existing pattern, and nobody
notices because each individual instance looks fine on its own.

## Scope

Fix these, file by file, citing the current inconsistency and picking (or confirming) one standard:

1. **Disabled primary CTA — 4 different treatments for one state.** Standardize on one pattern
   (recommend: keep the brand colour, just desaturate it, matching `checkout-form.tsx`'s
   `disabled:bg-brand-300` — going fully grey loses the brand identity, and swapping the whole pill
   like `app-header.tsx` does is unnecessary):
   - `src/components/ui/app-header.tsx` (editor "Next" button) — swaps to `bg-zinc-100 text-zinc-400`
   - `src/features/checkout/components/checkout-form.tsx` — `disabled:bg-brand-300`
   - `src/features/orders/components/track-form.tsx` — `disabled:opacity-60`
   - `src/features/editor/components/preview-screen.tsx` — `disabled:bg-zinc-300`

2. **Card corner radius — three values with no naming, drifting by page type.** Pick one radius for
   "content card" (recommend `rounded-2xl`, since it's already what the browsing/marketing pages use)
   and apply it to the transactional-page cards that currently use `rounded-lg`:
   `src/features/cart/components/cart-view.tsx`, `src/features/checkout/components/checkout-form.tsx`
   (note: this file uses BOTH `rounded-2xl` and `rounded-lg` internally — reconcile it first),
   `src/features/checkout/components/city-picker.tsx`, `src/features/orders/components/recent-orders.tsx`,
   `src/features/orders/components/track-form.tsx`, `src/app/(store)/order/[id]/page.tsx`. Leave
   `src/features/info/faq.tsx`'s `rounded-xl` accordion wrapper as a deliberate third tier only if you
   can confirm accordions are meant to read differently from cards — otherwise fold it in too.

3. **Two accordion implementations for one idea.** `src/features/info/faq.tsx` (custom animated
   chevron, `active:` press state, hidden native marker) and the "Details" `<details>` on
   `src/app/(store)/products/[slug]/page.tsx` (bare native triangle, no press state) should share one
   component — extract `faq.tsx`'s version as `src/components/ui/disclosure.tsx` (or similar) and use
   it in both places.

4. **Body/heading text colour split between the `text-ink` token and ad hoc `zinc-*` shades**, in some
   cases within the same file. Marketing/home pages consistently use `text-ink` (body) /
   `text-brand-900` (headings); `src/app/(store)/products/page.tsx`,
   `src/app/(store)/products/[slug]/page.tsx` (mixes both — fix this one first as the clearest case),
   `src/features/cart/components/cart-view.tsx`, `src/features/checkout/components/checkout-form.tsx`,
   `src/app/(store)/order/[id]/page.tsx`, `src/app/(store)/track/page.tsx` use `zinc-500/600/700/800/900`
   instead. Decide (ask the founder if it's not obvious from `docs/brand.md`) whether transactional
   pages are meant to look visually distinct from marketing pages — if not, replace the `zinc-*` shades
   with `text-ink`/`text-brand-900` throughout; if so, write that rule down in `docs/brand.md` so it
   stops looking like drift.

5. **The DPI/photo-quality warning is styled three different ways** for the same message family:
   `src/features/editor/components/print-quality-badge.tsx` (badge, `amber-900`),
   `src/features/editor/components/design-editor.tsx` (plain text, no background), the checkout
   warning banner in `checkout-form.tsx` (`amber-800` banner). Pick one visual weight (recommend the
   badge, since it's the most self-contained) and reuse it in all three places, or at minimum align the
   colour shade (`amber-800` vs `amber-900`).

6. **Card border done two ways** (`ring-1 ring-zinc-200` vs `border border-zinc-200`) for a visually
   identical hairline edge — pick `ring-1` (it doesn't affect box sizing) and standardize
   `product-card.tsx`'s image wrapper and `products-section.tsx` onto it.

7. **Touch targets under 44px sitting next to 44px controls in the same row** (CLAUDE.md's own
   baseline): `src/features/editor/components/selection-bar.tsx` (the "Aa"/font-select/Bold-Italic-
   Underline controls are 36px next to 44px Crop/Copy/Delete buttons three lines later),
   `src/features/editor/components/design-editor.tsx` (40px Undo/Redo next to the 44px back arrow),
   the "Centre"/"Straighten" chips (32px). Either bump these to 44px or, if 36px is a deliberate
   "secondary control" tier, document that tier in `docs/brand.md` and apply it consistently (right now
   it isn't — `cart-view.tsx`'s quantity steppers, `sheet.tsx`'s close button, and every colour swatch
   are also 36px, which may be fine as one consistent "secondary" size once it's a named rule rather
   than an accident).

8. **Inconsistent red shade for error/danger states**: most error text is `text-red-700`, the two
   blocking-content banners (checkout + editor) already agree on `red-800`/`bg-red-50`/`ring-red-200`
   (good, don't touch those), but `src/features/orders/components/order-timeline.tsx`'s "cancelled" dot
   uses `bg-red-600`. Align it to whichever shade becomes the one documented "danger" colour.

9. **CTA button height** — `h-12` in most flows, `h-11` in a few (`cart-view.tsx`'s own "Checkout"
   button is `h-12` but the "Start designing" empty-cart CTA one line above it is `h-11`;
   `checkout-form.tsx` has both). Standardize primary CTAs on one height.

### Also worth a look while in these files (from the same audit, not fully investigated)

`src/features/editor/components/crop-sheet.tsx`, `text-sheet.tsx`, `editor-stage.tsx`,
`src/features/catalog/components/product-art.tsx` and `product-gallery.tsx`,
`src/features/checkout/components/city-picker.tsx`, `consents.tsx`,
`src/features/orders/components/recent-orders.tsx`, `remember-order.tsx`,
`src/app/(store)/not-found.tsx`, `src/app/(store)/products/loading.tsx`, and the whole
`src/features/preview-3d/` (3D mug/tee/hoodie) tree were not reached by the original audit pass.
Worth a quick pass for the same patterns (card radius, touch-target size, disabled-state styling)
while working through this brief, since they're likely to have the same drift.

## Out of scope

- Hover/focus states and desktop container widths — already done in PR #35.
- Any change to the editor's own mobile-first `max-w-md` layout or its Fabric.js internals.
- A full component-library rewrite. Where a shared component is the obvious fix (item 3), extract one;
  otherwise this is a "pick one existing pattern and apply it everywhere" pass, not a redesign.

## Acceptance criteria

- No visual regression on any existing page (screenshot or manual check at 360px and desktop).
- Whatever you standardize on for each item is either already the dominant existing pattern (so most
  files don't change) or gets written down in `docs/brand.md` if it's a new rule.
- `pnpm check` green; `pnpm build && pnpm e2e` green (this touches shared UI across many pages).
