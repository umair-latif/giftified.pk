# 02 — WhatsApp messaging + reply webhook

> **POSTPONED — post-MVP scaling step.** In the MVP the founder confirms COD orders and
> sends files to vendors by hand (see task 08). Don't start this until it's back on the
> status board. The `Messenger` contract and mock stay in `src/lib/messaging/`.
> Phone-number normalisation (`src/lib/phone.ts`) now belongs to task 05.

**Branch:** `feat/whatsapp` · **Suggested owner:** any AI assistant (lead reviews)

## Goal

Implement `Messenger` using the **official Meta WhatsApp Cloud API**, and the
webhook that receives customer replies (Confirm / Cancel buttons).

## You may edit

- `src/lib/messaging/` (add `whatsapp-cloud.ts`, wire into `index.ts`)
- `src/lib/phone.ts` (new: Pakistani number normalisation — shared with checkout, coordinate with task 05)
- `src/app/api/webhooks/whatsapp/route.ts`
- `tests/unit/messaging-*.test.ts`, `tests/unit/phone.test.ts`, `tests/fixtures/whatsapp/*.json`
- `.env.example` (names only)

## Do not touch

`src/lib/messaging/types.ts`, `src/types/*`.

## Contract

`Messenger` in `src/lib/messaging/types.ts`.

## Requirements

- Server-only. Env: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
- **Do not use UltraMsg or other WhatsApp-Web-based services** (ban risk for the business number).
- `sendOrderVerification`: send the approved template `order_cod_confirm` (founder
  submits it in Meta Business Manager — see below) with two quick-reply buttons whose
  payloads are `confirm:<orderId>` and `cancel:<orderId>`. Language: English + Urdu variant.
- `sendVendorAlert`: template `vendor_new_order` with the order number, product summary and a
  document header pointing at `proofPdfUrl`.
- `verifySubscription`: `hub.mode === "subscribe"` and `hub.verify_token` matches → return `hub.challenge`.
- `parseInbound`: verify `X-Hub-Signature-256` (HMAC-SHA256 of raw body with app secret,
  timing-safe). Map button replies to `intent` + `orderId`; free-text "yes/haan/ji/confirm"
  → confirm, "no/nahi/cancel" → cancel, else "other". Ignore status updates (delivered/read).
- `src/lib/phone.ts`: `normalizePkMobile(input): PkMobile | null` accepting
  `03001234567`, `3001234567`, `+92 300 1234567`, `0092-300-1234567`; reject landlines
  and wrong lengths. Pure + heavily unit-tested.
- Route: `GET` = subscription handshake; `POST` = verify, parse, log intents, return `200` fast.

## Acceptance criteria

- Unit tests with recorded Cloud API webhook payloads (button reply, text reply, status update,
  bad signature). No network in tests.
- A manual script sends the template to a test number on the Meta sandbox.
- `pnpm check` green.

## Start now (founder, non-code — takes days)

Meta Business verification, a dedicated WhatsApp number, and template approval for
`order_cod_confirm` and `vendor_new_order`.
