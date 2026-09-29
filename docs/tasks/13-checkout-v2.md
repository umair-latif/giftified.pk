# 13 — Checkout v2 (from the cart)

**Branch:** `feat/checkout-v2` · **Suggested owner:** any AI assistant, ideally the one that did
task 05 (lead reviews) · **Needs:** 12 merged

## Goal

`/checkout` turns the whole cart into one WooCommerce order (one line per cart item), guest by
default, with an optional email.

## You may edit

- `src/features/checkout/` (form, schema, actions)
- `src/app/(store)/checkout/page.tsx` (new); keep the redirect at `src/app/design/[product]/order/`
- `tests/unit/checkout-*.test.ts`, `tests/e2e/checkout.spec.ts` (task 12 skipped it — rewrite it for `/checkout`
  and remove the `test.skip`)

## Do not touch

`src/features/cart/` (use its exported API), `src/types/*`, `src/lib/*`, the editor.

## Requirements

- Read items with `useCart()` from `src/features/cart/cart.ts`; clear with `clearCart()` after success;
  prices for many lines: `quoteCart` in `src/features/cart/actions.ts` (reuse it for the summary). Empty cart → message + link to `/products`.
- Summary: each line (thumbnail, product, colour/size, qty, price) + delivery by city + total; all
  prices from the server (`quoteOrder`-style Server Action for many lines).
- **Above the Place order button**, one line of small print with links:
  "By placing your order you agree to our [Terms](/terms), [Privacy notice](/privacy) and
  [Printing guidelines](/printing-guidelines)."
  (Links open in the same tab; the cart survives, so customers can read and come back.)
- **Content confirmation (required):** a checkbox that must be ticked before _Place order_:
  "I confirm my design follows Pakistani law (including PECA) and our
  [Printing guidelines](/printing-guidelines), and I have the right to print everything in it."
  Unticked → the button stays disabled with a short hint. Store it as order meta
  `_content_confirmed` = ISO timestamp. (One checkbox per order at checkout, not one per photo
  upload: it covers every design in the cart and doesn't slow down designing.)
- **Customer IP:** in the Server Action read the first hop of `x-forwarded-for` (fallback
  `x-real-ip`) via `headers()` and pass it as `CreateOrderInput.customerIp`; the adapter validates
  it and stores it as WooCommerce's `customer_ip_address`. The privacy notice says we store it.
- **Marketing opt-in:** one unticked checkbox under it — "Send me offers and discounts (Eid deals,
  new products)" → order meta `_marketing_optin` (`"yes"`/absent). Unticked by default; the order
  must go through whether or not it is ticked. Required by `docs/content/privacy.md`: without an
  explicit opt-in no marketing may be sent. Nothing sends messages yet (task 02). Signed-in
  customers can later change it in their profile (task 21).
- Fields as today + **Email (optional)** "for your receipt and updates" → `CreateOrderInput.email`.
- On _Place order_: for each entry of `distinctDesigns(items)` (`src/features/cart/cart-lines.ts`) call
  `uploadCartDesign(productId, designKey, { onProgress })` (`src/features/editor/upload-design.ts`) (progress:
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
