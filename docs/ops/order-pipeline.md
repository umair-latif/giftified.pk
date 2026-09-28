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

The links in the note look like `https://giftified.microw.me/api/files/<long code>`. The code is
signed and expires after 90 days; opening it redirects to a 5-minute R2 link. The bucket stays
private. Anyone who has the link can download that one file, so share the files with the vendor
and not the links.

## One-time setup (Vercel)

1. Vercel → your project → **Integrations** → add **Inngest** and connect it to this project.
   It sets `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in the Production environment.
2. Vercel → Settings → Environment Variables → add `INNGEST_SERVE_ORIGIN` =
   `https://giftified.microw.me` (Production), so Inngest calls your domain, not `*.vercel.app`.
3. Redeploy. In the Inngest dashboard → **Apps**, you should see `giftified` with the function
   `prepare-order-files`. If not, click **Sync** and use `https://giftified.microw.me/api/inngest`.
4. Optional env vars (Production):
   - `FILES_LINK_SECRET`: signs the download links. If it isn't set, a secret is derived from
     `WC_WEBHOOK_SECRET`. Changing either one breaks existing links, which you can recreate with
     `pnpm order:files`.
   - `APP_URL`: base URL for the links. Default: Vercel's production domain.

## Test it

- Place a test order (or `pnpm woo:smoke`). Within about a minute the order in WP admin gets the
  "Print files ready" note. In Inngest → **Runs** you can watch each step.
- Orders whose design isn't in R2 (for example `woo:smoke` orders, which use a fake design id) get
  the note "Couldn't make print files: … not found in storage". That's expected.

## When something goes wrong

| Note / symptom                                  | Meaning and fix                                                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| No note at all                                  | Check Vercel logs for `[commerce-webhook]`. "couldn't queue" means the Inngest integration or its keys are missing. Then run `pnpm order:files <id>`. |
| "Couldn't make print files: design … not found" | The customer's upload didn't finish. Ask them to order again.                                                                                         |
| "photo … was never uploaded"                    | Same as above, for a single photo.                                                                                                                    |
| "Print files failed after several tries"        | Temporary problem (R2 or WooCommerce unreachable). Setting the order to Processing retries once; otherwise run `pnpm order:files <id>`.               |
| "proof PDF failed: …"                           | The PNG is fine; send it with the order details, and report the message so the PDF builder can be fixed.                                              |

`pnpm order:files <orderId>` runs the same job on your computer using `.env.local`, which needs the
`WC_*` and `STORAGE_*` values. Lines that already have files are skipped, so it's safe to run again.

## Local development

Without Inngest keys the webhook still answers 200 and logs "couldn't queue". To run jobs locally:
`npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`, then start the app with
`INNGEST_DEV=1 pnpm dev`.
