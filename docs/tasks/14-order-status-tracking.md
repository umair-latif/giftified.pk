# 14 — Order status page and guest tracking

**Branch:** `feat/order-tracking` · **Suggested owner:** any AI assistant (lead reviews security) ·
**Needs:** A0 merged

## Goal

Guests can see their order's progress without an account, and nobody can see someone else's order
by guessing a number (today `/order/<id>` opens for anyone).

## You may edit

- `src/app/order/[id]/page.tsx` (move under `src/app/(store)/order/[id]/`)
- `src/app/(store)/track/page.tsx` (new), `src/features/orders/` (new)
- `src/lib/commerce/woo-map.ts` + `mock.ts`: map order meta `_courier`, `_tracking_number`,
  `_tracking_url` → `Order.tracking` (contract from A0), and implement `findOrderForTracking`
- `tests/unit/order-*.test.ts`, `tests/e2e/tracking.spec.ts`

## Do not touch

`src/server/orders/order-link.ts` (A0: `orderToken`, `verifyOrderToken`, `orderStatusUrl`),
`src/types/*`, `src/lib/commerce/types.ts`.

## Requirements

- `/order/[id]`: requires `?t=`; verify with `verifyOrderToken`. Missing/invalid → 404 page with a
  link to `/track`. Never show full phone or street address (masked phone, city only).
- Timeline: **Placed** (on-hold, "We'll call you on 0300 •••• 567 before printing") → **Confirmed**
  (processing) → **Shipped** (when `tracking` is set: courier, number, "Track parcel" link if URL)
  → **Delivered** (completed); **Cancelled** shown instead when cancelled.
- Lines: product, colour/size, qty, price; delivery; total.
- `/track`: order number + mobile (normalise with `normalizePkMobile`) → Server Action →
  `findOrderForTracking(id, phone)` → redirect to the token URL. Same error for "no such order" and
  "wrong phone". Rate-limit per IP (10 tries / hour; an in-memory map is fine for MVP — note it in
  the code) and add a small delay on failure.
- Recent orders on this phone: `saveRecentOrder({ id, t, createdAt })` / `listRecentOrders()` in
  `src/features/orders/recent.ts` (localStorage, try/catch, max 20). `/track` lists them on top.
- Document the two custom fields for the founder in `docs/ops/manual-dispatch.md` ("when you ship:
  add custom fields `_courier` and `_tracking_number`").

## Acceptance criteria

- Unit: token rejection, phone mismatch, tracking-meta mapping, rate limiter.
- E2E: confirmation URL works; same URL without `t` → 404; `/track` with right/wrong phone.
- `pnpm check` + `pnpm e2e` green.
