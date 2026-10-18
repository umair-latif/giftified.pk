# 30 — Reviews (WooCommerce reviews with photos)

**Branch:** `feat/reviews` · **Suggested owner:** any AI assistant (lead reviews) · **Needs:** plan `docs/plans/reviews.md`

## Goal

Verified buyers rate and review a product (stars, text, optional photo) after delivery. The founder
approves in WP admin. Nothing shows until real approved reviews exist.

## You may edit

- `src/features/reviews/` (new), `src/app/(store)/order/[id]/` (review form section only)
- `src/app/api/reviews/` (new), `src/server/jobs/` (review-request job), `src/lib/email/` templates
- product page reviews section under `src/app/(store)/` (display only)
- `tests/unit/review-*.test.ts`, `tests/e2e/reviews.spec.ts`, `docs/ops/manual-dispatch.md` (review link tip)

## Do not touch

`src/types/*`, `src/lib/commerce/types.ts` (adapter methods `listReviews`/`createReview` are a
separate lead-approved contract PR first), `src/config/products/`.

## Requirements

- Form only on `/order/[id]?t=` for a `completed` order; one review per order line; Zod on all input.
- Create via `POST /products/reviews`, `status: "hold"`, `verified: true`. No custom meta (unsupported).
- Photo: presigned PUT to R2, key `reviews/<orderId>/line-<n>/photo`; append `[photo: <signed link>]` to the
  review text while on hold; strip it on display; show the photo only when approved.
- Job on WC `order.updated` → `completed`: email "How was your order? Rate it" via `lib/email`, keyed by
  order ID (no double send).
- Product page: list + average + schema.org `AggregateRating`, ISR; section hidden with no approved reviews.
- Mock commerce supports reviews so tests need no live store.

## Done when

`pnpm check`, `pnpm build && pnpm e2e` green; one live test on staging (submit → hold → approve → shows).
