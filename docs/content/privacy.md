# Privacy notice — approved text

Written by the founder (28 Sep 2026). Task 15 builds `/privacy` from this text; keep the
wording, adapt only headings/formatting. `TODO(founder)` marks what is still missing.
**Promises here must match what the code does** — see "Engineering follow-ups" at the end.

Last updated: September 2026

## What we collect

Done on the page ("What we collect"). Was: short intro — name, mobile number, delivery address and city, the designs and
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
you explicitly check the opt-in box during checkout. You can opt out at any time by contacting
support, or in your account settings if you have an account. TODO(founder): once WhatsApp/SMS
messaging is live, add "or by replying 'STOP' to any message".

## How long we keep things

- **Photos & designs (guest orders):** Uploaded photos and canvas layers are automatically purged
  from our servers 30 days after your order has been successfully delivered.
- **Photos & designs (with an account):** If you order while signed in, your designs and their photos
  stay in your account so you can order again or keep editing, until you delete them or close your
  account. Deleting a design or your account removes its photos from our servers.
- **Print files:** The high-resolution print files made for production are purged 30 days after
  delivery for every order.
- **Order & Transaction Records:** Basic order details (name, address, purchased items, total price)
  are kept for up to 3 years to fulfill legal, accounting, and tax compliance requirements under
  Pakistani business regulations.

## Uploaded content and legal compliance

(Founder's text of 29 Sep 2026, adjusted to match the system: phones are confirmed by call, not
"verified"; approved designs follow the 30-day deletion; the IP address is stored from task 13 on.)

- **Design review:** every design is checked by our team before it is printed. Approved designs are
  kept only for as long as described above, for production and customer support.
- **Refused content:** if a design is refused because it breaks the law, including PECA, we may keep
  the uploaded file and the related order details (including phone number and IP address) instead of
  deleting them after 30 days.
- **Law enforcement:** we cooperate with the NCCIA and the FIA. If an upload constitutes a criminal
  offence under PECA — such as blasphemy, incitement of inter-faith or sectarian hatred, state
  defamation, or child exploitation — we will hand over the related order details, contact numbers,
  and IP addresses to the relevant authorities on official request.

Full refused-content list: `/printing-guidelines`.

## Cookies and browser storage

We use essential browser storage (`localStorage`) solely to keep track of your active cart and draft
canvas designs on your device. We do not use third-party cross-site tracking cookies or advertising
pixels without your explicit consent.

## Your choices

Contact page; reply within 7 working days (on the page).

---

## Engineering follow-ups (not part of the page text)

The page may only claim these once they are built:

1. **Retention model (29 Sep 2026):** guests → design + photos deleted 30 days after delivery;
   signed-in customers → design + photos kept in the account until they delete the design or the
   account (tasks 21/22 must really delete the files); print PNG + vendor PDF → deleted after 30 days
   for everyone (they can be re-rendered from the design).
   **30-day purge** — task 24: a scheduled job that deletes `designs/<id>/**` and
   `orders/<id>/**` from R2 30 days after an order is completed (and after cancellation).
   Built in task 24 (`data-retention`, nightly; see `docs/ops/order-pipeline.md`) — the claim is
   true once that PR is deployed.
2. **Marketing opt-in box at checkout** — task 13 must add an unticked opt-in checkbox and store the
   answer on the order; without it, no marketing messages may be sent. "Reply STOP" only applies once
   WhatsApp/SMS exists (task 02) — until then the text should say "or contact support".
3. **Signed file links** last 90 days; the purge job must also make older links 404 by then.
4. **IP address** is stored on orders once task 13 passes `customerIp` (contract added 29 Sep).
5. **Refused designs** are kept only if the order has `_retain_for_review` = `yes` (task 24).
6. **Where the opt-in lives:** the checkbox at checkout is the one that must exist (most customers
   order as guests and have no profile). Signed-in customers can change the same setting in
   `/account/profile` (task 21); it then pre-fills the checkout box.
7. **localStorage** claim is accurate today (cart, drafts, city, recent orders) — keep it true if
   analytics are ever added.
