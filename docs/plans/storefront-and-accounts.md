# Plan: storefront, cart, guest tracking and accounts

Status: **proposal** — decisions marked ❓ need the founder's OK before briefs are handed out.
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
/products/[slug]          Product page (mug, t-shirt, hoodie)
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

### Product page `/products/[slug]`

- Gallery (WooCommerce images; the 3D preview can be added here later, lazy, when task 04 lands).
- Name, price (updates with size), **Cash on Delivery** badge.
- Options: colour swatches; size buttons + size chart (apparel).
- **Start designing** → `/design/<product>?colour=…&size=…`.
- Delivery estimate: "Delivery to Lahore: Rs 200 · 3–5 working days" (city remembered).
- Details: material, print method, print area (mm, from `src/config/products`), care, reprint policy.
- Phase C: "Personalize a design" (templates for this product).

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
  number, see ❓3) → **Delivered** (completed); or **Cancelled**.
- Shows items with thumbnails, delivery city, total, and the confirmation note
  "We'll call you on 0300 •••• 567 before printing".
- `/track`: order number + mobile number → status page. Rate-limited.
- "Your recent orders on this phone": order links saved in the browser, so guests can reopen
  them without typing anything.

### Accounts (Phase B)

- `/sign-in`: **Continue with Google** and **Email me a sign-in link** (❓1). No passwords.
- `/account/orders`: list and detail (same timeline), **Order again** (copies the design into
  the cart).
- `/account/designs`: designs saved to the cloud from the editor ("Save to my designs");
  continue editing on any device.
- `/account/addresses`: saved addresses; the default fills checkout.
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
- Shipped/courier: see ❓3.

### Catalog data

- WooCommerce holds name, price, description, images, colours/sizes (the founder edits them in WP
  admin). `src/config/products/*` keeps print geometry and editor settings. Linked by SKU as today.
- Server Components fetch through the commerce adapter with caching; a `product.updated` webhook
  refreshes the cache so price changes show within seconds.
- Images through `next/image`; WooCommerce media domain added to `images.remotePatterns`.
- SEO: page metadata, Open Graph images, `sitemap.xml`, Product structured data in PKR.

### Accounts (Phase B)

- **Auth:** Better Auth (TypeScript, runs in Next route handlers; Google + magic link now,
  phone/WhatsApp OTP plugin later). Email via Resend (behind `src/lib/email`).
- **Database:** Postgres on Neon (Vercel Marketplace, free tier) + Drizzle ORM (❓2). Tables:
  auth (user, session, account, verification), `address`, `saved_design`
  (user, product, designId in R2, thumbnail, name, updatedAt).
- **WooCommerce link:** on first sign-in, create a WC customer (`POST /customers`) and store its ID;
  orders placed while signed in get `customer_id`; the account's order list = `GET /orders?customer=`.
- Orders stay in WooCommerce only — no copy in our DB, so there's nothing to keep in sync.

### Contract changes (lead, one small PR before assistants start)

- `src/types/cart.ts` (new).
- `CreateOrderInput`: optional `email`, optional `customerId` (Phase B).
- `CommerceClient`: `getOrderForTracking(id, phone)`, `listCategories()` (when needed),
  Phase B: `ensureCustomer(email, name)`, `listOrdersForCustomer(customerId)`.
- `Order`: optional `tracking?: { courier: string; number: string; url?: string }`.

## 6. Phases and task briefs

**Phase A: storefront and cart (no accounts)**

| #   | Task                                                            | Who                              | Needs |
| --- | --------------------------------------------------------------- | -------------------------------- | ----- |
| A0  | Contracts PR (§5) + site shell (header with cart badge, footer) | Lead                             | —     |
| 10  | Home page                                                       | Assistant                        | A0    |
| 11  | Catalog + product pages (WooCommerce data, caching, SEO)        | Assistant                        | A0    |
| 12  | Cart store + editor "Add to cart"/"Edit design" + cart page     | Lead (touches editor)            | A0    |
| 13  | Checkout v2: from cart, many lines, optional email              | Assistant (did task 05)          | 12    |
| 14  | Order status page with token, `/track`, recent orders           | Assistant (lead reviews)         | A0    |
| 15  | Help/FAQ, delivery, reprint policy, privacy, terms              | Founder writes, assistant builds | —     |

**Phase B: accounts**

| #   | Task                                                                  | Who              | Needs |
| --- | --------------------------------------------------------------------- | ---------------- | ----- |
| 16  | Auth + database foundation, sign-in page, WC customer link            | Lead             | A     |
| 17  | Account area: orders, addresses, profile, order again                 | Assistant        | 16    |
| 18  | Saved designs in the cloud ("Save to my designs", `/account/designs`) | Lead + assistant | 16    |

**Phase C: growth** (order to be decided with real data)

- **Photo frames** (editor, lead; before templates): the crop screen becomes **Crop & shape** with
  shape chips (Original, Circle, Rounded, Heart, Arch, Star, Polaroid). The photo fills the shape and
  can be moved/zoomed inside it; the selection bar gets _Replace photo_. Polaroid = white frame,
  caption, slight tilt, drop shadow. Soft shadows: fine on mugs; on apparel (DTF) switch to a solid
  offset shadow or off — confirm with vendors. Frames are saved in `design.json`, so the print file
  matches; the DPI check measures only the visible part of the photo.
- **Templates — "Personalize this design"** (Zazzle's main traffic driver): a template is a saved
  `design.json` with placeholder frames ("Tap to add photo") and editable text. The founder creates
  them with _Save as template_; they appear in a gallery on each product page and on occasion pages
  (`/occasions/eid`); tapping one opens the editor with it loaded (❓4).
- **Customer templates** (after accounts): signed-in customers can _Share as template_.
  - Photos become empty "Tap to add photo" frames by default (customers' photos are personal);
    keeping an image requires ticking "I own this image".
  - Every submission waits for the founder's approval (offensive content, logos/copyright).
  - Shown as "Design by <first name>"; creator rewards (discount codes, revenue share) later.
- Reviews with customer photos · WhatsApp order updates (task 02) · search · Urdu UI ·
  quantity discounts for teams/events · gift note.

## 7. Decisions for the founder

1. ❓ **Sign-in methods:** Google + email link now; WhatsApp OTP when task 02 comes.
   _Recommended._ (SMS OTP costs money per message and delivery in Pakistan is unreliable.)
2. ❓ **Database for accounts:** Neon Postgres (free tier, Vercel integration). _Recommended._
   Alternative: WooCommerce customers + a WP login plugin — fewer services, but slower and
   more PHP plugins.
3. ❓ **Shipped status:** type courier + tracking number into two custom fields on the order in
   WP admin (no plugin). _Recommended for MVP._ Alternative: a shipment-tracking plugin.
4. ❓ **Templates before or after accounts?** For gifting (Eid, birthdays), ready-made designs
   probably sell more than accounts do. _Recommended:_ Phase A → a few occasion templates → Phase B.
5. ❓ **Email at checkout optional** (not required). _Recommended._
6. **Founder inputs needed:** logo and brand colours, product photos/mockups for the catalog,
   delivery times per city, reprint/return policy text, t-shirt/hoodie print specs and prices.
