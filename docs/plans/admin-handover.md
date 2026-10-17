# Admin handover: moving values out of code

**Status: parked.** Nothing here is built. Decided 17 Oct 2026 (founder): do this
when the site is handed to a non-developer admin and the founder is no longer
available for small fixes — not before. Pre-launch these values change often and
the founder changes them, so a settings UI the founder alone uses is overhead.

The trigger to start: someone other than the founder needs to change copy,
images or dates, and waiting for a PR is not practical.

## The boundary

One rule decides where a value lives:

> Anything a non-developer should change lives in WordPress.
> Anything that affects print correctness lives in code.

Print geometry, DPI thresholds, mockup measurements and product colours stay in
code **deliberately**. A wrong number there silently produces unprintable files
or misaligned previews, so it should require a developer and a test run. That is
a feature, not a gap.

## Where things stand today

Already admin-managed in WooCommerce, no developer needed:

- products, prices, variations, product photos
- shipping zones and rates per city
- order statuses and the COD confirmation flow
- vendor contact fields on the order
- customers and orders
- **ready-made designs** — created in the designer itself and saved as
  templates, so seasonal designs need no deploy (`docs/ops/publishing-designs.md`)

That is the bulk of day-to-day work and it is in good shape.

Still code-locked, each one a PR:

| Thing                                                                | Where                                 | How often it changes                       |
| -------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| Content pages (Help/FAQ, About, Terms, Privacy, Printing guidelines) | `src/app/(store)/*`                   | often, early on                            |
| Contact details, tagline, socials                                    | `src/config/site.ts`                  | rarely                                     |
| Delivery estimates                                                   | `src/lib/delivery.ts`                 | seasonally (Eid rush, courier delays)      |
| Occasions and their dates                                            | `src/config/occasion-dates.ts`        | 2x/year (Eid)                              |
| Hero and marketing images                                            | `public/home/*`                       | per campaign                               |
| Print geometry, colours, sizes                                       | `src/config/products/*`               | when the vendor changes — **keep in code** |
| Mockup photos and measurements                                       | `public/mockups/*`, `mockup/specs.ts` | rarely — **keep in code**                  |
| Serviceable cities                                                   | `src/config/cities.ts`                | occasionally                               |

The one recurring maintenance item that already exists: `occasion-dates.ts`
carries `TODO(owner): check each Eid date a few weeks before and correct it
here`, because Eid depends on the moon sighting. Two edits a year, and if nobody
makes them the featured-occasion tile is wrong by a day or two at exactly the
time it matters most.

## Step 1 — Content pages in WordPress (highest value, do first)

WordPress already has Pages; no plugin needed. This removes the most frequent
reason an admin would need a developer.

**Mechanism.** The admin writes a WP page with slug `about`, `help`, etc. A
Next.js route `(store)/[slug]` fetches `/wp-json/wp/v2/pages?slug=<slug>` with
`revalidate`, sanitises the HTML, and renders it inside the existing
`InfoPage`/`InfoSection` shell so it keeps our fonts, spacing and header. SEO
title and description come from the WP fields.

**Move:** Help/FAQ and About — they change often and are pure prose.

**Keep in code:** Terms, Privacy, Printing guidelines. They change rarely and
carry legal or correctness weight; leaving them in code costs the admin nothing.

Four things to solve:

1. **Dynamic values in the copy.** The pages interpolate real constants today —
   `PRINT_DPI` on About, `DELIVERY_DAYS` elsewhere. In WP these become either
   hardcoded text that silently goes stale, or short-codes like
   `[delivery_days]` we substitute on render. Short-codes are correct but are
   extra work, and the admin must be taught they exist.
2. **Sanitising.** WP HTML goes through a strict allow-list before rendering.
   The editor can paste anything, including scripts. Non-negotiable.
3. **Styling arbitrary HTML.** Structure is enforced by components today. Once
   it is WP HTML we need a prose stylesheet that makes any reasonable
   heading/list/table look right, and we accept that a determined admin can make
   an ugly page.
4. **Fallback.** If WP is down or the slug is missing the page must still
   render — keep the code version as the fallback, or cache the last good copy.
   A 500 on a policy page is worse than slightly stale text.

**Cost:** about a day for the route, sanitiser, prose styles and fallback, plus
moving the content across.

## Step 2 — A settings page in wp-admin

A small custom WP plugin (~200 lines PHP) registering a settings page, the
fields, and one REST route (`/wp-json/designbanana/v1/settings`) returning JSON.
Next.js reads it in a Server Component with `revalidate`, like the catalog.
Images use the WP media library, so the admin gets the normal upload UI and we
get a URL.

**Fields worth exposing:** contact number, hero text, hero image, delivery days,
occasion list and dates, featured-occasion override, occasion tile images. All
plain values with no correctness risk.

Three things to settle before building:

1. **Cache delay.** With ISR the admin saves and sees nothing change for up to
   the revalidate window, so they save again thinking it failed. Add a WP save
   hook that calls a Next.js revalidate webhook — from the start, not later.
2. **Validation.** A blank hero text or a 4 MB PNG must not reach the site.
   Validate in the plugin (required fields, image size) _and_ parse with Zod our
   side, with a code fallback when a value is missing or junk. The site must
   never break because a field was cleared.
3. **It is custom PHP.** `CLAUDE.md` currently says built-in WooCommerce only,
   no custom PHP for MVP, and that any server plugin needs a written reason.
   Building this is a deliberate reversal of that rule and needs a line in
   `CLAUDE.md` recording the decision. The plugin must live in this Git repo,
   not only on the server, or it is lost on a host migration.

**Cost:** 1–2 days, assuming a flat settings page. A repeatable occasion builder
is the expensive part; if a fixed set of occasions with editable dates and images
is acceptable, it is roughly half the work.

**Cheaper interim:** a Vercel env var (e.g. `FEATURED_OCCASION=eid`) lets the
featured occasion be forced or corrected from the Vercel dashboard in 30 seconds
with no code deploy. Worth doing the first time the automatic choice is wrong.

## Step 3 — Marketing images

A WP media field read at build/ISR time, so an admin can swap the hero without a
developer. Folds into step 2 once the settings plugin exists.

## Not code: the rest of the handover

Easy to forget and more likely to cause an outage than any of the above.

- **Accounts and billing:** WordPress/IONOS, Vercel, Cloudflare (DNS + R2 +
  email routing), Resend, Inngest, the domain registrar, Google and the social
  accounts. Who holds the keys, who pays, and what happens if the admin leaves.
  See `docs/ops/accounts.md`.
- **Runbooks for a non-developer.** `docs/ops/manual-dispatch.md` and
  `docs/ops/order-pipeline.md` assume a terminal today. They need a rewrite in
  admin language before handover.
- **The Eid dates.** Until step 2 exists, put a yearly reminder in a calendar —
  not in a code comment.
