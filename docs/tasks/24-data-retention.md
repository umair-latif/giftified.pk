# 24 — Delete customer photos and print files after 30 days

**Branch:** `feat/retention` · **Owner:** Lead · **Needs:** 08 (order pipeline)

## Why

`docs/content/privacy.md` promises: "Uploaded photos, canvas layers, and high-resolution print files
are automatically purged from our servers 30 days after your order has been successfully delivered."
Nothing deletes them today, so the promise isn't true yet — the privacy page must not claim it until
this ships.

## Scope

- A scheduled Inngest function (daily): find orders completed or cancelled ≥ 30 days ago, delete
  `designs/<designId>/**` (design + original photos) and `orders/<id>/**` (print PNG, vendor PDF)
  from storage, then add an order note "Print files deleted (30-day retention)". Idempotent.
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
