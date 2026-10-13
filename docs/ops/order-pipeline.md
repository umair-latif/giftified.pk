# Order pipeline: setup and troubleshooting

What happens after a customer orders:

1. WooCommerce creates the order (**On hold**) and sends the `order.created` webhook to
   `/api/webhooks/commerce`.
2. The webhook checks the signature, answers 200 at once and queues the event
   `order/files.requested` in **Inngest** (id `order-files-<orderId>-<status>`, so repeats within
   24 h are ignored; setting the order to Processing triggers one more check).
3. Inngest calls `/api/inngest`, which runs the job `prepare-order-files`, one step per order line:
   load the design + original photos from R2 → render the 300 DPI PNG → save it to
   `orders/<id>/line-<n>/print.png` in R2 → build `VendorProof.pdf` next to it → write both links
   on the line item (`_print_png_url`, `_proof_pdf_url`).
4. A note appears on the order in WP admin: **"Print files ready (300 DPI)"** with a **Print PNG**
   and a **Vendor PDF** link per line.
5. You confirm with the customer and send the files to the vendor by hand. See
   [manual-dispatch.md](manual-dispatch.md).

## Links are private

The links in the note look like `https://designbanana.pk/api/files/<long code>`. The code is
signed and expires after 90 days; opening it redirects to a 5-minute R2 link. The bucket stays
private. Anyone who has the link can download that one file, so share the files with the vendor
and not the links.

## One-time setup (Vercel)

Nothing to install: the `inngest` package is already in the project (don't run `npm install`).
Inngest's Quickstart tabs (.env.local, route, client, function) are already done in the code.

1. Vercel → your project → **Integrations** → add **Inngest** and connect it to this project.
   Leave **Custom Environment Variable Prefix** empty (the code reads the exact names), and pick
   Production. It sets `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
2. Vercel → Settings → Environment Variables → add `INNGEST_SERVE_ORIGIN` =
   `https://designbanana.pk` (Production), so Inngest calls your domain, not `*.vercel.app`.
3. **Redeploy** (new env vars only reach new deployments). Then open
   `https://designbanana.pk/api/inngest` in a browser:
   - `{"message":"Unauthorized"}` → correct (only Inngest may call it).
   - `{"code":"internal_server_error"}` → the deployment has no `INNGEST_SIGNING_KEY`: check it's
     set for Production and redeploy.
4. Inngest dashboard → **Apps**: you should see `giftified` with the jobs
   `prepare-order-files`, `vendor-handoff` and `data-retention`. If not, click **Sync new app** and
   use `https://designbanana.pk/api/inngest`. See _Resync_ below.
5. Optional env vars (Production):
   - `FILES_LINK_SECRET`: signs the download links. If it isn't set, a secret is derived from
     `WC_WEBHOOK_SECRET`. Changing either one breaks existing links, which you can recreate with
     `pnpm order:files`.
   - `APP_URL`: base URL for the links. Default: Vercel's production domain.

## Resync: after a new job or a domain change

**Deploying is not enough.** Inngest stores the list of jobs and the app's URL at the moment the app
was last synced. A new job in `src/server/jobs/functions.ts` goes live on Vercel but stays invisible
to Inngest until the app is resynced: its event is accepted, nothing matches it, and nothing runs —
no error anywhere. The same applies after a domain change, because the stored URL is the one Inngest
calls.

So resync whenever you **add a job** or **change the domain**:

Inngest → **Apps** → the `giftified` card → **⋮** → **Resync** (set the URL to
`https://designbanana.pk/api/inngest` if it offers to).

The card then shows **Last synced at** (just now) and every job, each with its trigger. Check the
count: if a job you expect is missing, the resync didn't pick up the deployment you think it did.

**This happened on 13 Oct 2026:** the "Send to vendor" email never arrived. The app had last been
synced on 28 Sep, under the old `giftified.microw.me` domain, and listed only `prepare-order-files`.
`vendor-handoff` was written afterwards, so Inngest had never heard of it. One resync fixed it.

### Which Inngest account?

Installing Inngest from Vercel's marketplace creates an Inngest account with an auto-generated name
(ours is `account-citrine-village`, shown on the Vercel integration page under _Connect to_). That is
**not** the same as an account you create yourself at inngest.com with GitHub. Signing in directly
can land you in the other account, where the app and its history don't exist — and keys from one
account never work against the other.

To be sure you're in the right one: Vercel → **Integrations** → the Inngest row → **Manage** →
**Open in Inngest**. If your browser is already signed in to a different Inngest account it may keep
that session, so use a private window when in doubt.

Keep exactly **one** Inngest integration in Vercel. A second one overwrites `INNGEST_EVENT_KEY` and
`INNGEST_SIGNING_KEY` with its own account's keys, and then nothing matches anything.

The four `INNGEST_*` variables in Vercel are managed by the integration and have no **Edit** option,
only _Manage Connection_, _Rotate Integration Secrets_, _View History_ and _Delete_. To replace them,
use the integration's **Update Project Connection**, then redeploy.

## Test it

- Place a test order (or `pnpm woo:smoke`). Within about a minute the order in WP admin gets the
  "Print files ready" note. In Inngest → **Runs** you can watch each step.
- Orders whose design isn't in R2 (for example `woo:smoke` orders, which use a fake design id) get
  the note "Couldn't make print files: … not found in storage". That's expected.

## When something goes wrong

| Note / symptom                                  | Meaning and fix                                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| No note at all                                  | Check Vercel logs for `[commerce-webhook]`. "couldn't queue" means the Inngest integration or its keys are missing. Then run `pnpm order:files <id>`. |
| A job never runs, no error anywhere             | The app wasn't resynced after the job was added: Inngest → Apps shows an old **Last synced at** and too few jobs. **Resync** (see above).             |
| `401` when syncing or validating the app URL    | The signing key of the Inngest account you're in isn't the one the live site has. Usually the wrong account (see above), or a redeploy is missing.    |
| "Couldn't make print files: design … not found" | The customer's upload didn't finish. Ask them to order again.                                                                                         |
| "photo … was never uploaded"                    | Same as above, for a single photo.                                                                                                                    |
| "Print files failed after several tries"        | Temporary problem (R2 or WooCommerce unreachable). Setting the order to Processing retries once; otherwise run `pnpm order:files <id>`.               |
| "proof PDF failed: …"                           | The PNG is fine; send it with the order details, and report the message so the PDF builder can be fixed.                                              |

`pnpm order:files <orderId>` runs the same job on your computer using `.env.local`, which needs the
`WC_*` and `STORAGE_*` values. Lines that already have files are skipped, so it's safe to run again.

## Data retention (30-day purge)

The privacy notice promises that files are deleted 30 days after delivery. The Inngest function
**`data-retention`** does this every night at **03:30 Pakistan time** (22:30 UTC). It shows up in
Inngest → Apps next to `prepare-order-files` after the next deploy + sync.

For every order that has been **Completed** or **Cancelled** for at least 30 days:

| What                                               | Guest order (no customer account) | Order placed while signed in  |
| -------------------------------------------------- | --------------------------------- | ----------------------------- |
| Print PNG + Vendor PDF (`orders/<id>/…` in R2)     | deleted                           | deleted                       |
| Design + uploaded photos (`designs/<designId>/…`)  | deleted                           | **kept** (customer's account) |
| Order in WooCommerce (name, address, items, total) | kept (3 years)                    | kept (3 years)                |

- "Closed since" = the **date completed** for Completed orders, and the **last-modified date** for
  Cancelled ones (WooCommerce stores no cancellation date, so editing a cancelled order restarts
  its 30 days).
- The order gets one note, **"Print files deleted (30-day retention)."** (guests: **"Print files
  and design photos deleted (30-day retention)."**), and the hidden custom field
  `_retention_done` = the date. That field is how the job knows it's finished: it never touches the
  order again, and never adds a second note.
- **Refused designs:** orders with the custom field `retain_for_review` = `yes` (or `_retain_for_review` via the REST API) are never purged.
  How to set it: [manual-dispatch.md](manual-dispatch.md#refused-designs). Set it **before** the 30
  days are over — files that are already deleted can't come back.
- **Abandoned uploads:** designs that were uploaded at checkout but never ended up on any order are
  deleted once their newest file is 30 days old.
- A design that is still used by another order that is kept (open, recent, signed-in or marked for
  review) is never deleted.
- On-hold, Processing, Refunded, Failed or Pending orders are never purged.
- Old print-file links in order notes then show "This file is no longer available".

Safety rails (the job keeps the files and says why rather than guessing):

- It reads **every** order first. If the number of orders drops while it reads (an order was deleted
  at that moment), it stops and tries again later.
- If WooCommerce returns no orders at all, or most old designs look unused, the abandoned-upload
  sweep is skipped (probably the wrong store) — see the summary in Inngest → Runs.
- It refuses to run with real R2 but no `WC_URL`.
- At most 200 orders and 500 abandoned designs per night; the rest follow the next night.
- **Never point a test/staging WooCommerce store at the production R2 bucket**: order numbers
  would clash and the job would delete production print files for the test store's orders.

Settings and checks:

- `RETENTION_DAYS` (Vercel env var, optional): default **30**. Whole number, at least 7; anything else
  makes the job fail instead of guessing. Only change it together with the privacy notice.
- `pnpm retention:dry-run` lists, from `.env.local` (`WC_*` + `STORAGE_*`), exactly which orders,
  folders and abandoned designs **would** be deleted tonight, with file counts and sizes, and what is
  kept on purpose. It deletes nothing and writes nothing to orders. Run it before the first night
  and whenever you're unsure.
- Inngest → Runs → `data-retention` shows each night's summary (orders purged, designs deleted,
  files deleted, skipped with reasons).

## Local development

Without Inngest keys the webhook still answers 200 and logs "couldn't queue". To run jobs locally:
`npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`, then start the app with
`INNGEST_DEV=1 pnpm dev`.
