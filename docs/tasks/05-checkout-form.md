# 05 — COD checkout form

**Branch:** `feat/checkout-form` · **Suggested owner:** any AI assistant — a second Claude session, Cursor or Gemini (lead reviews)

## Goal

The "Order" step: a mobile-first Cash on Delivery form that creates the order through
`getCommerce().createOrder()` (the mock for now) and shows a confirmation screen.

## You may edit

- `src/features/checkout/`
- `src/app/design/[product]/order/page.tsx` (new) and `src/app/order/[id]/page.tsx` (new)
- `src/app/api/checkout/route.ts` **or** a Server Action in `src/features/checkout/actions.ts`
- `src/lib/phone.ts` (new) — `normalizePkMobile(input): PkMobile | null`, pure + unit-tested.
  Accept `03001234567`, `3001234567`, `+92 300 1234567`, `0092-300-1234567`; reject landlines and wrong lengths.
- `src/config/cities.ts` (new: Pakistani city list)
- `tests/unit/checkout-*.test.ts`, `tests/e2e/checkout.spec.ts`
- One line in `src/app/design/[product]/preview/page.tsx`: set `next={{ label: "Order", href: ... }}`

## Do not touch

`src/lib/commerce/*`, `src/types/*`, the editor.

## Contracts

`CreateOrderInput`, `CustomerDetails`, `Order` in `src/types/order.ts`; `CommerceClient`.

## Requirements

- Use `AppHeader` (back → Preview) and `StepBar current="Order"` like the other screens.
- Fields: full name, mobile (normalised to `+92…` with `normalizePkMobile`), city
  (searchable list with the 30 largest cities + "Other"), address, landmark (optional).
- Big inputs (≥ 44 px tall), `inputMode="tel"`, `autocomplete` attributes, errors inline in
  plain language (English now; Urdu later).
- Validate on the server with Zod; never trust client prices — show the total returned by
  `createOrder`.
- Generate `checkoutId` once per attempt (`newId()` from `src/lib/id.ts` — not `crypto.randomUUID()`, which is missing on plain-HTTP pages such as the dev server opened from a phone) so double taps don't
  create two orders; disable the button while submitting.
- Order summary: product, quantity (1–10), shipping by city from `quoteShipping`, total in
  PKR formatted `Rs 1,699`.
- Confirmation page `/order/[id]`: "Thank you! We'll call or message you on <number> to confirm your
  order before we print it." (Confirmation is manual in the MVP.)
- `designId`: before creating the order, call `uploadDesignForOrder(productId, { onProgress })` from
  `src/features/editor/upload-design.ts`. It saves the design and uploads the original photos straight
  to storage (show a progress bar: "Uploading your photo 1 of 2…"), and returns `{ designId }` for the
  order line. It throws `DesignUploadFailed` with a customer-friendly message — show it and let them retry.
- **Block the order when a photo is too blurry:** `printQualityReport(draft.fabric).status === "block"`
  (`src/lib/print-quality.ts`) → show "A photo is too blurry to print — go back and make it smaller"
  with a link to the editor. `"warn"` → allow, but show a gentle note.
- Keep the page's JS small: no form libraries heavier than ~10 KB gz.

## Acceptance criteria

- Unit tests for validation and phone normalisation edge cases.
- E2E on 360px: fill form → submit → confirmation shows order number; double submit creates one order.
- `pnpm check` + `pnpm e2e` green.
