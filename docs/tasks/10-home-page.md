# 10 — Home page

**Branch:** `feat/home` · **Suggested owner:** any AI assistant (lead reviews) · **Needs:** A0 (site shell) merged

## Goal

A fast, friendly home page at `/` that sends people to the products. Plan:
`docs/plans/storefront-and-accounts.md` §4. Brand: `docs/brand.md`.

## You may edit

- `src/app/(store)/page.tsx` (the home route inside the store layout from A0; delete the old
  `src/app/page.tsx` in the same PR)
- `src/features/home/` (new: section components)
- `public/home/` (new: images — WebP, hero ≤ 100 KB, others ≤ 60 KB)
- `tests/e2e/home.spec.ts`

## Do not touch

`src/components/site/*` (header/footer, A0), `src/lib/*`, `src/types/*`, the editor, checkout.

## Sections (mobile-first, 360 px)

1. **Hero:** headline "Your photo, your words — on a mug, tee or hoodie", line "Pay cash on
   delivery across Pakistan", button **Start designing** → `/products`. One product image
   (`next/image`, `priority`, sized for 360 px and 768 px). This is the LCP element.
2. **Products:** one card per product: image, name, "from Rs 1,499" (from
   `getCommerce().listProducts()`), link to `/products/<slug>`. Products without a print config
   (`getProduct()` from `src/config/products` returns null) show **Coming soon**, not clickable.
3. **How it works:** 3 steps with icons — Design on your phone → See it in 3D → Pay when it arrives.
4. **Occasions:** tiles Eid, Birthday, Shaadi, Anniversary, Mother's Day, 14 August, Team/Corporate.
   Link to `/products` for now (task 19 will point them to `/occasions/<slug>`). Use magenta/yellow
   accents from the brand tokens.
5. **Why Giftified:** COD everywhere · we call to confirm before printing · 300 DPI print quality ·
   free reprint if it arrives damaged. Keep claims editable in one array at the top of the file.

## Requirements

- Server Component page; no client JS except what the shell already has. No carousels.
- Prices come from WooCommerce through the adapter (mock in dev/e2e); cache like the catalog task
  does (`revalidate` / Next 16 caching — read `node_modules/next/dist/docs/` first).
- Use brand tokens only (`bg-brand-600`, `text-ink`, `bg-mint-100` …), no raw hex.
- Placeholder images are fine; name them clearly (`hero-placeholder.webp`) so the founder can swap them.

## Acceptance criteria

- E2E at 360 px: page loads, no horizontal scroll, _Start designing_ goes to `/products`, the mug card
  links to `/products/mug`, T-shirt shows "Coming soon".
- `pnpm build` shows `/` as static or ISR; first-load JS for `/` not larger than today's.
- `pnpm check` + `pnpm e2e` green.
