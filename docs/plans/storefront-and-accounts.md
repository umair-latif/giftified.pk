# Plan: storefront, cart, guest tracking and accounts

Status: **agreed** (2026-09-28). Task briefs: `docs/tasks/10-…` to `23-…`, board in `docs/tasks/README.md`.
Inspiration: zazzle.com, adapted to Pakistan (mobile-first, COD, WhatsApp, occasions like Eid).

## 1. Principles

1. **Guest first.** Everything — browse, design, cart, order, track — works without an account.
   An account is a convenience (history, saved designs, saved addresses), never a gate.
2. **Phone is the identity in Pakistan**, email is optional. Order tracking for guests uses
   order number + mobile number.
3. **Same performance budget** as today: storefront pages are Server Components without Fabric or
   Three (LCP < 2.5 s on mid-range Android over 4G). The editor stays lazy-loaded.
4. **WooCommerce stays the back office** for products, prices, orders and statuses. We only add a
   small database for things WooCommerce can't hold well (sessions, saved designs).
5. **Security:** order pages are never reachable just by guessing a number (see §5).

## 2. What Zazzle does that we copy (and what we skip)

| Zazzle                                              | Giftified.pk                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| Header: logo, search, sign in, cart                 | Same, compact for 360 px: logo · account · cart with count               |
| Occasion tiles (Weddings, Birthdays…)               | Eid, Birthday, Shaadi/Mehndi, Anniversary, Mother's/Father's Day, 14 Aug |
| "Create your own" vs "Personalize this design"      | Phase A: create your own. Phase C: templates to personalize              |
| Category page with filters and product cards        | Catalog with 3 products; category chips (Drinkware, Apparel) when useful |
| Product page: options, personalize, delivery date   | Options + "Start designing" + delivery estimate by city + COD badge      |
| Cart with "Edit design", many items                 | Same; plus "Add another size" for apparel (same design, new size)        |
| Guest or account checkout                           | Guest by default; sign-in optional                                       |
| Account: orders, saved designs, track order         | Same; guests track with order no. + mobile                               |
| Marketplace of independent creators, licensed shops | Skip (not our model)                                                     |
| Membership (Zazzle Plus)                            | Skip for now                                                             |

## 3. Site map

```
/                         Home
/products                 Catalog (all products; ?category= later)
/products/[slug]          Category page: "Design your own" first, then its design gallery
/design/[product]         Editor (exists) ?colour=&size=  or  ?item=<cartItemId> to edit a cart item
/design/[product]/preview Preview (exists) → "Add to cart"
/cart                     Cart
/checkout                 Checkout (guest default, sign-in optional)
/order/[id]?t=<token>     Confirmation / order status (token required)
/track                    Track an order: order number + mobile number
/sign-in                  Phase B
/account                  Phase B: overview
/account/orders[/id]      Phase B: order history, status, reorder
/account/designs          Phase B: saved designs (continue on any device)
/account/addresses        Phase B
/account/profile          Phase B: name, phone, email, sign out, delete account
/help                     FAQ: delivery times, COD, reprint policy, photo quality tips
/about  /contact  /privacy  /terms
```

## 4. Pages

### Home `/`

1. **Hero:** "Your photo, your words — on a mug, tee or hoodie. Pay cash on delivery."
   CTA _Start designing_ → `/products`. One product mockup image (optimised, LCP element).
2. **Products:** 3 cards (image, name, "from Rs 1,499") → product pages.
3. **How it works:** Design on your phone → See it in 3D → Pay when it arrives.
4. **Occasions:** tiles (Eid, Birthday, Shaadi, Anniversary, Mother's Day, 14 August, Team/Corporate).
   Phase A: link to the catalog. Phase C: link to occasion templates.
5. **Why us:** COD everywhere · we call to confirm before printing · 300 DPI print quality ·
   free reprint if it arrives damaged · delivery in N working days.
6. **Customer photos / reviews** (later, once real).
7. **Footer:** Track order · Help · Contact (WhatsApp link) · Privacy · Terms · social links.

### Catalog `/products`

Grid of product cards: image, name, one-line spec, "from" price (from WooCommerce), colour dots.
Products without print specs yet (t-shirt, hoodie) show **Coming soon** and aren't clickable into
the editor. Category chips appear only when there are enough products to need them.

### Product category page `/products/[slug]` (e.g. `/products/mugs`)

One page per product type; it is both the product page and its design gallery:

1. Compact header: name, "from Rs 1,499", **Cash on Delivery** badge, **Details** (expands: gallery,
   material, print method, print area in mm, delivery estimate for your city, reprint policy).
2. **First card, always: "Design your own"** — large, prominent, brand teal, blank-product image,
   button **Start designing** → editor (colour/size chosen in the editor; sizes also at _Add to cart_).
3. **Design gallery** after it: templates for this product (task 19), occasion chips to filter
   (Eid, Birthday, Shaadi…), tap → editor with the template loaded. Until templates exist the page
   shows only the "Design your own" card and the details.

### Editor → Preview → **Add to cart** (change)

- The Preview step's final button becomes **Add to cart** (instead of going straight to Order).
- Step bar: Design → Preview → Cart.
- Opening `/design/mug?item=<id>` edits that cart item's design; the button then says
  **Save changes**.

### Cart `/cart`

- Each line: design thumbnail, product, colour/size, quantity stepper, price, **Edit design**,
  **Add another size** (apparel: same design, new line), **Remove**.
- Subtotal, delivery estimate once a city is known, total. **Checkout** button.
- Empty state with links to products.
- Prices always re-quoted from the server; the cart stores no prices.
- Cart header icon shows the item count on every page.

### Checkout `/checkout`

- Guest by default. Phase B: "Have an account? Sign in" at the top, and a checkbox
  "Create an account with this email" after the order.
- Fields as today + **optional email** ("for your receipt and updates").
- On _Place order_: upload each distinct design once (progress shown), then create one
  WooCommerce order with one line per cart line. The print job already handles many lines.
- Limits against abuse: max 10 per line, max 10 lines; orders above a set total
  (e.g. Rs 25,000) get a note "confirm carefully" for the founder.
- Success → `/order/<id>?t=<token>`; the cart empties.

### Order status `/order/[id]?t=…` and tracking `/track`

- Timeline: **Placed** (on-hold) → **Confirmed** (processing) → **Shipped** (courier + tracking
  number, see §7.3) → **Delivered** (completed); or **Cancelled**.
- Shows items with thumbnails, delivery city, total, and the confirmation note
  "We'll call you on 0300 •••• 567 before printing".
- `/track`: order number + mobile number → status page. Rate-limited.
- "Your recent orders on this phone": order links saved in the browser, so guests can reopen
  them without typing anything.

### Accounts (Phase B)

- `/sign-in` and `/sign-up`: **Continue with Google**, or **email + password** (with _Forgot password_).
- `/account/orders`: list and detail (same timeline), **Order again** (copies the design into
  the cart).
- `/account/designs`: designs saved to the cloud from the editor ("Save to my designs");
  continue editing on any device.
- `/account/addresses`: the default delivery address (fills checkout).
- `/account/profile`: name, phone, email; sign out; delete account.

## 5. Technical design

### Cart (client-side, as CLAUDE.md requires)

- New shared contract `src/types/cart.ts`:
  `CartItem { id, productId, colourId, size?, quantity, designKey, thumbnail?, addedAt }`.
- Items in localStorage; each item's `DesignDocument` and its photos in IndexedDB (the photo store
  already exists). The per-product draft stays for "the design I'm working on"; **Add to cart**
  snapshots it into a new item, then starts a fresh draft.
- "Add another size" = a new line pointing at the same `designKey`, so the design uploads once.
- Checkout uploads each distinct design via the existing `/api/designs`, then places the order.

### Order links and tracking (fixes the open-by-number issue)

- `/order/[id]` requires `t` = HMAC(order id + phone) with the existing signed-link code
  (`src/server/files/links.ts` pattern). Without a valid token → 404.
- `/track` checks order number + mobile against WooCommerce, then redirects with a token.
  Rate-limited by IP (e.g. 10 per hour).
- Shipped/courier: see §7.3.

### Catalog data

- WooCommerce holds name, price, description, images, colours/sizes (the founder edits them in WP
  admin). `src/config/products/*` keeps print geometry and editor settings. Linked by SKU as today.
- Server Components fetch through the commerce adapter with caching; a `product.updated` webhook
  refreshes the cache so price changes show within seconds.
- Images through `next/image`; WooCommerce media domain added to `images.remotePatterns`.
- SEO: page metadata, Open Graph images, `sitemap.xml`, Product structured data in PKR.

### Accounts (Phase B) — WooCommerce is the account store, no extra database

- **Customers are WooCommerce customers** (visible in WP admin → Customers). Name, email, phone and
  the default address live on the WC customer; saved designs as a small list in customer meta.
- **Sessions:** a signed, http-only cookie (stateless; Auth.js or equivalent — lead picks in task 19).
- **Google:** verified Google email → find the WC customer by email or create it.
- **Email + password:** sign-up creates the WC customer with a password (WordPress stores the hash).
  Sign-in checks the password through the **JWT Authentication for WP REST API** plugin
  (server-side only), then we issue our own cookie. Same email = same account for both methods.
- **Forgot password:** our own 1-hour signed reset link (no database), emailed via **Resend**
  (`src/lib/email`); the new password is saved with `PUT /customers/{id}`.
- **Brute force:** **Limit Login Attempts** plugin on WordPress + a per-IP limit on our sign-in route.
- **Orders:** placed while signed in carry `customer_id`; "My orders" = `GET /orders?customer=`.
  WooCommerce's own customer emails (order received / processing / completed) are used as-is once
  WP Mail SMTP is set up.
- A small database can be added later (email sign-in links, many saved designs) without changing
  what customers see.

### Contract changes (lead, one small PR before assistants start)

- `src/types/cart.ts` (new).
- `CreateOrderInput`: optional `email`, optional `customerId` (Phase B).
- `CommerceClient`: `getOrderForTracking(id, phone)`, `listCategories()` (when needed),
  Phase B: `ensureCustomer(email, name)`, `listOrdersForCustomer(customerId)`.
- `Order`: optional `tracking?: { courier: string; number: string; url?: string }`.

## 6. Phases and task briefs

Briefs are in `docs/tasks/`; owners and status on the board in `docs/tasks/README.md`.

**Phase A — storefront and cart (no accounts)**

| #   | Task                                                               | Who                              | Needs |
| --- | ------------------------------------------------------------------ | -------------------------------- | ----- |
| A0  | Contracts + site shell (header with cart badge, footer)            | Lead                             | —     |
| 10  | Home page                                                          | Assistant                        | A0    |
| 11  | Catalog + product pages                                            | Assistant                        | A0    |
| 12  | Cart: store, editor "Add to cart"/"Edit design", cart page         | Lead                             | A0    |
| 13  | Checkout v2: from the cart, many lines, optional email             | Assistant                        | 12    |
| 14  | Order status page (token), `/track`, recent orders, shipped info   | Assistant (lead reviews)         | A0    |
| 15  | Help/FAQ, delivery, reprint policy, privacy, terms, contact        | Founder writes, assistant builds | A0    |
| 16  | Editor ↔ print font parity (same font files in browser and server) | Lead                             | —     |

**Phase A2 — frames and templates**

| #   | Task                                                             | Who       | Needs  |
| --- | ---------------------------------------------------------------- | --------- | ------ |
| 17  | Photo frames: "Crop & shape", Polaroid, Replace photo            | Lead      | —      |
| 18  | Templates: placeholders, "Save as template", placeholder library | Lead      | 17     |
| 19  | Template gallery on product pages + occasion pages               | Assistant | 11, 18 |

- **Photo frames** (editor, lead; before templates): the crop screen becomes **Crop & shape** with
  shape chips (Original, Circle, Rounded, Heart, Arch, Star, Polaroid). The photo fills the shape and
  can be moved/zoomed inside it; the selection bar gets _Replace photo_. Polaroid = white frame,
  caption, slight tilt, drop shadow. Soft shadows: fine on mugs; on apparel (DTF) switch to a solid
  offset shadow or off — confirm with vendors. Frames are saved in `design.json`, so the print file
  matches; the DPI check measures only the visible part of the photo.
- **Templates — "Personalize this design"** (Zazzle's main traffic driver): a template is a saved
  `design.json` with placeholder frames ("Tap to add photo") and editable text. The founder creates
  them with _Save as template_; they appear in a gallery on each product page and on occasion pages
  (`/occasions/eid`); tapping one opens the editor with it loaded.
- **Customer templates** (after accounts): signed-in customers can _Share as template_.
  - Customers' photos are **always removed** on sharing. Each photo frame gets a generic sample
    photo from a **placeholder library**: AI-generated images the founder creates and approves in
    advance (couples, kids, friends, family, pets, landscapes…), matched to the frame's shape. The
    customer who later uses the template taps the sample photo to replace it with their own.
    Founder templates use the same library.
  - Every submission waits for the founder's approval (offensive content, logos/copyright).
  - Shown as "Design by <first name>"; creator rewards (discount codes, revenue share) later.

**Phase B — accounts**

| #   | Task                                                                  | Who                      | Needs  |
| --- | --------------------------------------------------------------------- | ------------------------ | ------ |
| 20  | Auth: Google + email/password on WooCommerce customers, reset, limits | Lead                     | A      |
| 21  | Account area: orders, address, profile, order again                   | Assistant                | 20     |
| 22  | Saved designs ("Save to my designs", `/account/designs`)              | Lead + assistant         | 20     |
| 23  | Customer-shared templates (photos replaced, founder approval)         | Assistant (lead reviews) | 19, 22 |

**Later:** reviews with customer photos · WhatsApp order updates (task 02) · search · Urdu UI ·
quantity discounts for teams/events · gift note · Apple sign-in if many iPhone users.

## 7. Decisions (2026-09-28)

1. **Sign-in:** Google + email/password. No sign-in links. WhatsApp code later (task 02).
2. **Accounts:** stored in WooCommerce customers; no extra database for now.
3. **Shipped:** the founder fills two custom fields on the order in WP admin: `_courier` and
   `_tracking_number` (optional `_tracking_url`). No plugin.
4. **Order of work:** Phase A → photo frames → templates → accounts.
5. **Email at checkout:** optional.
6. **No claiming of earlier guest orders** (test data is wiped before launch).
7. **Customer-shared templates:** customers' photos are always removed and replaced with samples from
   the founder's AI-generated placeholder library; the founder approves every submission.

**Founder inputs needed:** SVG logo, product photos/mockups, delivery times per city, reprint/return
policy text, t-shirt/hoodie print specs and prices, placeholder photo library.
