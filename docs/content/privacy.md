# Privacy notice — approved text

Written by the founder (28 Sep 2026). Task 15 builds `/privacy` from this text; keep the
wording, adapt only headings/formatting. `TODO(founder)` marks what is still missing.
**Promises here must match what the code does** — see "Engineering follow-ups" at the end.

Last updated: September 2026

## What we collect

TODO(founder): short intro — name, mobile number, delivery address and city, the designs and
photos you upload, and basic order details.

## Who sees what

- **Printing partners:** Receive only the production sheet and high-resolution print file (order
  number, item, size, print graphics, and destination city). They do not receive your phone number
  or exact street address.
- **Courier & Logistics partners:** Receive your recipient name, delivery address, and phone number
  solely to deliver your parcel and collect Cash on Delivery.
- **Technical Service Providers:** Secure cloud hosting, database, file storage, and messaging
  providers that process data strictly on our behalf to run the website and send order confirmations.
- **No Data Selling:** We never sell, rent, or trade your personal information or uploaded designs to
  third parties or advertisers under any circumstances.

## Marketing messages

We will only send you marketing or promotional messages (such as special Eid offers or discounts) if
you explicitly check the opt-in box during checkout. You can opt out at any time by replying 'STOP'
to any WhatsApp/SMS message or contacting support.

## How long we keep things

- **Photos & Print Files:** Uploaded photos, canvas layers, and high-resolution print files are
  automatically purged from our servers 30 days after your order has been successfully delivered.
- **Order & Transaction Records:** Basic order details (name, address, purchased items, total price)
  are kept for up to 3 years to fulfill legal, accounting, and tax compliance requirements under
  Pakistani business regulations.

## Cookies and browser storage

We use essential browser storage (`localStorage`) solely to keep track of your active cart and draft
canvas designs on your device. We do not use third-party cross-site tracking cookies or advertising
pixels without your explicit consent.

## Your choices

TODO(founder): how to ask for a copy or deletion of your data, and the contact address for it.

---

## Engineering follow-ups (not part of the page text)

The page may only claim these once they are built:

1. **30-day purge** — task 24: a scheduled job that deletes `designs/<id>/**` and
   `orders/<id>/**` from R2 30 days after an order is completed (and after cancellation).
   Until it ships, files are kept indefinitely.
2. **Marketing opt-in box at checkout** — task 13 must add an unticked opt-in checkbox and store the
   answer on the order; without it, no marketing messages may be sent. "Reply STOP" only applies once
   WhatsApp/SMS exists (task 02) — until then the text should say "or contact support".
3. **Signed file links** last 90 days; the purge job must also make older links 404 by then.
4. **localStorage** claim is accurate today (cart, drafts, city, recent orders) — keep it true if
   analytics are ever added.
