# Founder facts — approved answers

Supplied by the founder (30 Sep 2026). These are the source of truth for the customer-facing
copy on `/help`, `/contact` and `/about`. **If a policy here changes, change it here first**,
then update the page that renders it (each entry names the file).

`TODO(founder)` marks what is still open.

## Contact details → `src/config/site.ts`

| What      | Value                                      |
| --------- | ------------------------------------------ |
| WhatsApp  | `+49 15209144535`                          |
| Email     | `designbanana.admin@gmail.com` (for now; move to `@designbanana.pk` later) |
| Instagram | `@designbananapk` → https://instagram.com/designbananapk |
| TikTok    | `@designbananapk` → https://tiktok.com/@designbananapk |
| Facebook  | TODO(founder) — placeholder https://facebook.com until the page exists |
| YouTube   | TODO(founder) — placeholder https://youtube.com until the channel exists |
| Hours     | 7am – 6pm PKT, every day                   |

**TODO(founder): the WhatsApp number is German (+49), not Pakistani.** It is published as-is for
now, but COD customers in Pakistan will see a foreign support number. Swap it for a PK number when
one exists — one-line change in `src/config/site.ts`.

## Delivery → `/help` ("How long does delivery take")

- **Delivery: 5–7 days once printing is finished.**
- Delivery charge varies by city, so the page says it is shown at checkout before the order is
  placed. The real figure comes from the WooCommerce flat-rate zones — it is never hardcoded.
- **Printing: 1–3 days after the customer confirms.** Total ≈ 6–10 days (also on the home page).
- **Delivery is nationwide** — no excluded areas.
- **Tracking numbers** are sent by email or message when the parcel goes to the courier.
- **Unconfirmed orders:** we wait about a week, then cancel. The founder added that without signing
  in the design changes would be lost; the page says a guest's design "may not be kept" (guest
  designs are purged under the retention job; saved designs for accounts are task 22, not built yet).

## Cancellation → `/help` ("Can I change or cancel my order?")

Possible **until the design is handed over to printing**, which happens after the order is verified
by call or message. After that it cannot be cancelled, because the item is made to order.

## Reprints and refunds → `/help` ("What if my product arrives damaged or misprinted?")

Report within **48 hours** with the order number, a description and clear photos.

- **Reprint** — offered when the fault is in the *printing* (smudged, misaligned, wrong colours,
  wrong size printed).
- **Refund** — only for a fault on our side: a printing fault, or a product that arrived damaged
  (broken/chipped mug, torn garment). Reported with photos within 48 hours.
- **Not covered** — a change of mind; a mistake in the design the customer sent (typo, wrong photo,
  misspelled name); a photo that printed soft after the editor warned it was low quality and the
  customer ordered it anyway.

## Brand story → `/about`

The founder asked for "a generic line, or not at all". One generic opening line is on the page; the
"What we care about" section was removed rather than shipped empty, since no brand values were
supplied. If brand values are written later, add them to `docs/brand.md` and restore that section.
