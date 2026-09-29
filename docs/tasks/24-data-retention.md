# 24 — Delete customer photos and print files after 30 days

**Branch:** `feat/retention` · **Owner:** Lead · **Needs:** 08 (order pipeline)

## Status: in review (`feat/retention`)

Done:

- Storage contract: `list(prefix, { cursor?, limit? })` → `{ objects: {key, size, lastModified}[], cursor? }`
  and `deletePrefix(prefix)` → count (folder prefixes only, `assertFolderPrefix`). R2/S3 via
  ListObjectsV2 + per-object DELETE (8 in parallel); memory store too.
- Commerce contract: `listOrdersForRetention(page)` (ALL orders, oldest id first, `_fields`-slim,
  with `closedAt`, `customerId`, `designIds`, `retainForReview`, `retentionDoneAt`, plus
  `total`/`totalPages`) and `markRetentionDone(id, doneAt)` (`_retention_done` meta).
- `src/server/jobs/retention.ts` (pure, injected deps): `planRetention` (read-only) →
  `purgeOrder` / `purgeDesigns`; Inngest `data-retention` cron `TZ=Asia/Karachi 30 3 * * *`,
  concurrency 1, one step per order / 25 abandoned designs. `pnpm retention:dry-run`.
- `/api/files/<token>` answers a plain 404 ("no longer available") once the file is gone.
- Why all orders instead of `modified_before`: to delete a design safely the job must know every
  order that still uses it (open, recent, signed-in, refused). WC REST can't filter by meta, and
  `modified_before` would miss orders edited after completion.

Open:

- Account orders: the design is always kept for now. Tasks 21/22 must delete `designs/<id>/` when the
  customer deletes a design/account, and saved designs that were never ordered must be protected
  from the abandoned-upload sweep (it currently treats "on no order" as abandoned).
- Refunded/failed orders are never purged (kept conservatively) — decide with the founder.
- The daily scan reads every order; fine for thousands, revisit (e.g. an `after` window) at ~50k.

## Why

`docs/content/privacy.md` promises: "Uploaded photos, canvas layers, and high-resolution print files
are automatically purged from our servers 30 days after your order has been successfully delivered."
Nothing deletes them today, so the promise isn't true yet — the privacy page must not claim it until
this ships.

## Scope

- A scheduled Inngest function (daily): find orders completed or cancelled ≥ 30 days ago and:
  - **always** delete `orders/<id>/**` (print PNG, vendor PDF — they can be re-rendered);
  - **guest orders** (no `customer_id`): also delete `designs/<designId>/**` (design + photos);
  - **account orders** (`customer_id` set): keep the design — it belongs to the account until the
    customer deletes it or the account (tasks 21/22); the job only deletes it if it is no longer in
    the customer's saved designs;
  - add an order note "Print files deleted (30-day retention)". Idempotent.
- Storage: add `list(prefix)` and `deletePrefix(prefix)` to the storage adapter (+ memory mock).
- **Skip refused content:** orders with meta `_retain_for_review` = `yes` (the founder sets it in WP
  admin when a design is refused for breaking the law) are never purged — the privacy notice says
  refused uploads may be kept. Document this in `docs/ops/manual-dispatch.md`.
- Designs never attached to an order (abandoned uploads) are deleted after 30 days too.
- `/api/files/<token>` must answer 404 once the file is gone (it already will — check the message).
- Order records stay in WooCommerce (3-year retention, per the privacy notice).
- Founder switch: `RETENTION_DAYS` env var (default 30); `pnpm retention:dry-run` lists what would
  be deleted without deleting.

## Acceptance criteria

Unit tests with the memory storage and mock commerce: nothing deleted before the cut-off, everything
deleted after, re-running is a no-op, an order still on-hold is untouched. Ops note in
`docs/ops/order-pipeline.md`.
