# 11 — Catalog and product pages

**Branch:** `feat/catalog` · **Suggested owner:** any AI assistant (lead reviews) · **Needs:** A0 merged

## Goal

`/products` lists all products; `/products/[slug]` lets the customer pick colour/size, see price and
delivery cost, and tap **Start designing**. Plan: `docs/plans/storefront-and-accounts.md` §4–5.

## You may edit

- `src/app/(store)/products/` (new: `page.tsx`, `[slug]/page.tsx`, `loading.tsx`)
- `src/features/catalog/` (new)
- `src/lib/commerce/woo-map.ts`, `woo-schemas.ts`, `woocommerce.ts`, `mock.ts` — only to fill the
  new catalog fields A0 adds to `CatalogProduct` / `CatalogVariant` (images, descriptions, slug,
  colour name/hex). **Not** `types.ts`.
- `src/app/api/webhooks/catalog/route.ts` (new) — cache refresh on `product.updated`
- `src/app/sitemap.ts` (new), `scripts/woo-seed-lib.ts` (colour attribute change below)
- `next.config.ts`: only `images.remotePatterns` for the WooCommerce media host (from `WC_URL`)
- `tests/unit/catalog-*.test.ts`, `tests/e2e/catalog.spec.ts`

## Do not touch

`src/types/*`, `src/lib/commerce/types.ts`, the editor, checkout, `src/config/products/*`.

## Catalog page `/products`

- Grid (2 columns at 360 px): image, name, one-line spec, "from Rs …", colour dots.
- Products without a print config show **Coming soon** and link nowhere.

## Product page `/products/[slug]`

- Gallery from WooCommerce images (swipe with CSS scroll-snap, no library).
- Name, price (updates when size changes), **Cash on Delivery** badge.
- Colour swatches (name + hex from WooCommerce, see below), size buttons (apparel) + size chart
  (static table from WC description for now).
- **Start designing** → `/design/<productId>?colour=<colourId>&size=<size>`.
- Delivery estimate: city picker (reuse `src/features/checkout/components/city-picker.tsx`) →
  "Delivery to Lahore: Rs 200". Remember the city in `localStorage` (`giftified:city`) inside a
  try/catch. Use a Server Action that calls `getCommerce().quoteShipping(city)`.
- Details: WC description (sanitise: strip scripts/styles/iframes — allow p, ul, li, strong, em, br),
  print area in mm from `src/config/products` (`printArea.widthMm × heightMm`), reprint policy line.
- `generateMetadata` (title, description, Open Graph image), JSON-LD `Product` with `Offer` in PKR,
  `generateStaticParams` for the products in config.

## Colours from WooCommerce

So the founder can add a colour in WP admin without code: use a **global** attribute
`pa_colour` (Products → Attributes → Colour). Each term's **description** holds its hex
(`#FFFFFF`). Map it to `CatalogVariant.colourName/colourHex`; fall back to
`src/config/products/*` `baseColors` when missing. Update `woo:seed` to create the global attribute
and terms (keep it idempotent; existing local attribute still works).

## Caching

Read Next 16's caching guide in `node_modules/next/dist/docs/` first. Cache catalog reads
(1 hour) with a tag; `/api/webhooks/catalog` verifies the WooCommerce signature (reuse the HMAC
check in `src/lib/commerce/woo-webhook.ts`) and revalidates the tag on `product.*` topics.
Document the webhook in `docs/ops/woocommerce-staging.md` (topic _Product updated_, same secret).

## Acceptance criteria

- Unit tests: mapping of images/descriptions/colours (WC fixtures), HTML sanitiser, fallback colours.
- E2E at 360 px (mock commerce): catalog → mug page → pick colour → _Start designing_ opens the
  editor with `?colour=white`; delivery estimate shows "Rs 200" for Lahore; no horizontal scroll.
- `/products` and `/products/mug` are static/ISR in `pnpm build`; no Fabric/Three in their bundles.
- `pnpm check` + `pnpm e2e` green.
