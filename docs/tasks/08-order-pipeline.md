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

## Later (post-MVP)

Replace steps 4–5 with task 02 (WhatsApp confirmation buttons + automatic vendor alert).
