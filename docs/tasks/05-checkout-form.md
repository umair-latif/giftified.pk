# 05 — COD checkout form

**Branch:** `feat/checkout-form` · **Suggested owner:** Intern + Cursor (lead reviews)

## Goal

The "Order" step: a mobile-first Cash on Delivery form that creates the order through
`getCommerce().createOrder()` (the mock for now) and shows a confirmation screen.

## You may edit

- `src/features/checkout/`
- `src/app/design/[product]/order/page.tsx` (new) and `src/app/order/[id]/page.tsx` (new)
- `src/app/api/checkout/route.ts` **or** a Server Action in `src/features/checkout/actions.ts`
- `src/lib/phone.ts` — coordinate with task 02 (whoever lands first owns it; the other reuses it)
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
- Generate `checkoutId` once per attempt (`crypto.randomUUID()`) so double taps don't
  create two orders; disable the button while submitting.
- Order summary: product, quantity (1–10), shipping by city from `quoteShipping`, total in
  PKR formatted `Rs 1,699`.
- Confirmation page `/order/[id]`: "We'll send you a WhatsApp message to confirm your order."
- `designId`: for now use a placeholder `"draft-local"`; design upload to storage is a later task.
- Keep the page's JS small: no form libraries heavier than ~10 KB gz.

## Acceptance criteria

- Unit tests for validation and phone normalisation edge cases.
- E2E on 360px: fill form → submit → confirmation shows order number; double submit creates one order.
- `pnpm check` + `pnpm e2e` green.
