# Founder facts — approved answers

Supplied by the founder (30 Sep 2026). These are the source of truth for the customer-facing
copy on `/help`, `/contact` and `/about`. **If a policy here changes, change it here first**,
then update the page that renders it (each entry names the file).

`TODO(founder)` marks what is still open.

## Contact details → `src/config/site.ts`

| What      | Value                                      |
| --------- | ------------------------------------------ |
| WhatsApp  | `+49 15209144535`                          |
| Email     | `brainmasala1@gmail.com`                   |
| Instagram | `@elyou.dgn` → https://instagram.com/elyou.dgn |
| TikTok    | `@elyou.designs` → https://tiktok.com/@elyou.designs |
| Facebook  | TODO(founder) — given as `#` (no URL yet); hidden until filled in |
| YouTube   | TODO(founder) — given as `#` (no URL yet); hidden until filled in |
| Hours     | 7am – 6pm PKT, every day                   |

**TODO(founder): the WhatsApp number is German (+49), not Pakistani.** It is published as-is for
now, but COD customers in Pakistan will see a foreign support number. Swap it for a PK number when
one exists — one-line change in `src/config/site.ts`.

## Delivery → `/help` ("How long does delivery take")

- **Delivery: 5–7 days once printing is finished.**
- Delivery charge varies by city, so the page says it is shown at checkout before the order is
  placed. The real figure comes from the WooCommerce flat-rate zones — it is never hardcoded.
- TODO(founder): **printing turnaround** — how many working days to print after the customer
  confirms. Without it the page cannot state a total delivery time, which is the single fact
  customers ask for most. (`why-giftified.tsx` also waits on this.)
- TODO(founder): any areas we don't deliver to.
- TODO(founder): do customers get a courier tracking number, and if so by SMS or WhatsApp?
- TODO(founder): how many times / over how many days do we try to reach a customer before
  cancelling an unconfirmed order?

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
