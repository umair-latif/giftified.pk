# 13 — Checkout v2 (from the cart)

**Branch:** `feat/checkout-v2` · **Suggested owner:** any AI assistant, ideally the one that did
task 05 (lead reviews) · **Needs:** 12 merged

## Goal

`/checkout` turns the whole cart into one WooCommerce order (one line per cart item), guest by
default, with an optional email.

## You may edit

- `src/features/checkout/` (form, schema, actions)
- `src/app/(store)/checkout/page.tsx` (new); remove `src/app/design/[product]/order/` (task 12
  leaves a redirect — keep it)
- `tests/unit/checkout-*.test.ts`, `tests/e2e/checkout.spec.ts`

## Do not touch

`src/features/cart/` (use its exported API), `src/types/*`, `src/lib/*`, the editor.

## Requirements

- Read items with the cart API from task 12. Empty cart → message + link to `/products`.
- Summary: each line (thumbnail, product, colour/size, qty, price) + delivery by city + total; all
  prices from the server (`quoteOrder`-style Server Action for many lines).
- Fields as today + **Email (optional)** "for your receipt and updates" → `CreateOrderInput.email`.
- On _Place order_: for each distinct `designKey` call `uploadCartDesign(designKey)` (progress:
  "Uploading design 1 of 2…", photos inside it counted too), then `placeOrder` with all lines.
  Upload results are cached per attempt so a retry doesn't re-upload.
- Server: Zod-validate every line; max 10 lines, qty 1–10; each line's design must exist in storage
  (as today); keep `checkoutId` idempotency.
- Success: clear the cart, save the order in "recent orders" (`saveRecentOrder` from task 14 if
  merged, else skip), redirect to `/order/<id>?t=<token>` (`orderStatusUrl()` from A0).
- Blurry-photo rule per design: any `block` → can't order that item (show which one, link to
  _Edit design_); `warn` → gentle note.

## Acceptance criteria

- Unit: multi-line schema, limits, optional email, token URL.
- E2E at 360 px: two cart items (one with 2 qty) → checkout → confirmation shows both lines; double
  tap creates one order; empty cart state.
- `pnpm check` + `pnpm e2e` green.
