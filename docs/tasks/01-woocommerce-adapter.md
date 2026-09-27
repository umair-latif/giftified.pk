# 01 — WooCommerce adapter + order webhook

**Branch:** `feat/woo-adapter` · **Suggested owner:** a second Claude Code session

## Goal

Implement the real `CommerceClient` against headless WooCommerce (REST API v3),
and the webhook route that receives WooCommerce order events.

## You may edit

- `src/lib/commerce/` (add `woocommerce.ts`, wire it into `index.ts`)
- `src/app/api/webhooks/commerce/route.ts`
- `tests/unit/commerce-*.test.ts`, `tests/fixtures/woo/*.json`
- `.env.example` (variable names only)

## Do not touch

`src/lib/commerce/types.ts`, `src/types/*` (contracts — propose changes in a separate PR).

## Contract

`CommerceClient` in `src/lib/commerce/types.ts`; order types in `src/types/order.ts`.
Read the "Commerce: headless WooCommerce" section of `CLAUDE.md` first.

## Requirements

- Server-only (`import "server-only"`). Auth with `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET`
  (HTTP Basic over HTTPS). Base URL `WC_URL`. Use `fetch`; no WooCommerce SDK needed.
- Validate every WC response with Zod (already installed) before mapping to our types.
- `createOrder`: re-price from WC, `payment_method: "cod"`, `set_paid: false`,
  `status: "on-hold"`, billing/shipping from `CustomerDetails`, line-item `meta_data`
  `_design_id`. Idempotent on `checkoutId` (store it as order meta `_checkout_id` and
  search for it before creating).
- `quoteShipping`: read flat-rate shipping zones by city from WC; cache for 10 min.
- `listProducts`/`getProduct`: map WC variable products + variations to `CatalogProduct`,
  matching our `ProductId` via SKU (`mug`, `tshirt`, `hoodie`). Cache with Next `revalidate`.
- `verifyWebhook`: HMAC-SHA256 of the **raw** body with `WC_WEBHOOK_SECRET`, base64,
  compare with `X-WC-Webhook-Signature` using a timing-safe compare. Topic from
  `X-WC-Webhook-Topic`, delivery ID from `X-WC-Webhook-Delivery-ID`.
- Route `POST /api/webhooks/commerce`: read raw body (`await req.text()`), verify, return
  `401` on bad signature, `200` fast otherwise. For now just log the verified event
  (the queue/worker is wired later). WooCommerce's "ping" on webhook creation must get `200`.
- `getCommerce()` returns the WooCommerce client when `WC_URL` is set, else the mock.

## Acceptance criteria

- Unit tests with recorded WC JSON fixtures (no network in tests): mapping, repricing,
  idempotency lookup, shipping by city, signature valid/invalid/tampered body.
- Works against the staging store (founder provides URL + keys): create a test COD order
  from a script and see it "On hold" in WP admin with `_design_id` meta.
- `pnpm check` green.

## Open questions (ask the founder)

Staging URL + API keys; SKUs for each product; shipping zones per city.
