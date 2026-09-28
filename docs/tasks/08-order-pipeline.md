# 08 — Order pipeline, manual dispatch (MVP)

**Branch:** `feat/order-pipeline` · **Owner:** Lead (Claude) · **Needs:** 01, 03, 07

## Goal

When an order is placed, everything the founder needs to confirm it and hand it to the
vendor is ready on the order in WP admin — no WhatsApp automation.

## Flow

1. Customer submits checkout → order created in WooCommerce as **On hold** (task 05 + 01).
2. WC webhook `order.created` → `/api/webhooks/commerce` → enqueue job (idempotent on order ID).
3. Worker, per line item:
   - load the saved `DesignDocument` + original uploads from storage
   - `renderPrintFile` → 300 DPI PNG (task 07) → upload to storage
   - `buildVendorProof` → `VendorProof.pdf` (task 03) → upload to storage
   - `setLineFiles` with both URLs; `addOrderNote`: "Print files ready: <PNG link> · <PDF link>"
4. **Founder (manual):** calls/messages the customer to confirm address and details →
   sets the order to **Processing** in WP admin (or **Cancelled**).
5. **Founder (manual):** downloads the PNG + PDF from the order note and sends them to the
   vendor on their own WhatsApp/email; adds an order note "Sent to <vendor>".
6. On delivery and cash collected → **Completed**.

## Requirements

- Files are generated on `order.created`, before confirmation, so they're ready when the
  founder calls. Nothing is sent to a vendor automatically.
- Download links: signed storage URLs valid ≥ 30 days, or a small authenticated
  `/api/orders/[id]/files` route (decide during implementation).
- A short founder checklist in `docs/ops/manual-dispatch.md` (confirm script in English/Urdu,
  what to check, how to send files, which status to set).
- Idempotent: webhook re-delivery or a job retry must not create duplicate files/notes.

## Notes from the task-01 review (must handle here)

- **Our own writes trigger webhooks.** `setLineFiles` does `PUT /orders/{id}`, which fires
  `order.updated`. Dedupe jobs on _(order ID, step)_ — e.g. "files rendered for order 5123" —
  not on the webhook delivery ID, or rendering will loop.
- **Orders typed into WP admin by hand** may have a landline or badly formatted phone;
  `mapOrder` currently throws on that, so `getOrder` would fail in the worker. Make the
  worker tolerate it (render files anyway; flag the phone in an order note).
- **Double submit across server instances**: `createOrder`'s idempotency is scan-then-create,
  so two simultaneous requests landing on different instances could both create an order.
  The checkout button is disabled while submitting (task 05), which covers MVP traffic; if
  duplicates show up, add a short-lived lock (e.g. KV `SET NX` on `checkoutId`).
- `toPkMobile` in `woo-map.ts` duplicates `src/lib/phone.ts` (task 05): switch to the shared
  one when it lands.

## Later (post-MVP)

Replace steps 4–5 with task 02 (WhatsApp confirmation buttons + automatic vendor alert).
