# Design consistency audit — mobile (360 px) and desktop (1280 px)

Every page was rendered from a production build at both sizes (signed in, with one item in the cart) and
compared. Screens: home, products, product, design, preview, cart, checkout, track, help, about, contact,
privacy, terms, printing guidelines, sign-in, sign-up, reset password, account, 404.
Colour/radius/disabled-button drift is already listed in [task 25](tasks/25-design-tokens.md) and is not repeated.

## What is already consistent

Header with cart/account/track icons, footer, brand teal and cream, pill buttons, rounded cards, form fields
(one `Field`/`inputClass`), FAQ accordions, no horizontal scroll on any page at 360 px.

## Done in this pass (the design flow)

- **Design screen:** header says **Design**, the next button says **Preview**, back goes to the **product page**
  (cart item: back to the cart). The product name moved to the line under the step bar.
- **Preview screen:** the flat image and the tab switcher are gone. The preview is a **gallery of mockups**
  (large image + thumbnail strip). Today: left and right side of the mug. Adding an angle or a product = one
  entry in `MOCKUP_VIEWS` and a spec in `mockup/specs.ts`. The flat design is only shown when a product has no
  mockup photo yet (t-shirt, hoodie) or composing fails. To see the flat design, go back to Design.

## Suggested optimisations (biggest impact first)

### 1. One width system (the main desktop inconsistency)

Pages use four different column widths, so the left edge of the content jumps from page to page and never lines
up with the logo:

| Width   | Pages                                       |
| ------- | ------------------------------------------- |
| 448 px  | editor, preview, sign-in/up, reset, account |
| ~640 px | cart, checkout, track, help, about, legal   |
| ~768 px | home text                                   |
| 1024 px | header, footer, products grid, product page |

Proposal: three named containers — **narrow** (448: sign-in, account, editor), **content** (640: cart, checkout,
track, info, legal), **wide** (1024: home, products, product page, header, footer) — and use only those.
Product page: cap the hero image (it is 570 px tall on desktop) and put image and "Start designing" side by side
from `lg`.

### 2. Editor on desktop

At 1280 px the canvas is a 450 px strip in the middle with about 350 px of empty space under it, and the toolbar
floats at the very bottom. On mobile the same empty space sits under the canvas. Proposal: from `lg`, a two-pane
layout — canvas centred and larger (up to ~720 px wide), tools in a right-hand panel — and on mobile move the
"Layers / how to" hint into the toolbar, or show a small live mug mockup under the canvas.

### 3. Flow steps are not shown after Preview

The step bar reads Design → Preview → **Cart**, but the order ends at Checkout, and cart/checkout do not show the
bar at all. CLAUDE.md names the steps Design → Preview → Order. Proposal: rename step 3 to **Order** and show the
same bar (step 3) on `/cart` and `/checkout`, so the customer sees the whole path until the end.

### 4. Page titles look different by page type

Info pages use teal headings (`text-brand-900`, larger), while cart, checkout, track, account, sign-in and reset
use dark grey (`text-ink`/zinc). Same H1 role, two looks. Proposal: one `PageTitle` component (size, colour,
spacing) for every page; covered in part by task 25 item 4.

### 5. Products: card layout and imagery

- Mobile grid is 2 columns with three products, so **Hoodie sits alone**; use 1 column on mobile, or 2 columns
  only with an even number of products.
- Home cards use the placeholder photos, the products page uses line icons: same products, two images.
  Use one image source (the WooCommerce image) in both.
- The Custom Mug card shows a stray empty circle under the description (looks like a radio button). Remove it.

### 6. Footer on desktop

The two link columns are spread across 1024 px, with a big gap in the middle. Use a 4-column row on `md+`
(products / help / company / legal) and align its left edge with the header (the footer text starts ~12 px left of
the logo today).

### 7. 404 page

The only page without the site shell: the plain Next default (no header, footer or brand). Add a root
`not-found.tsx` with the shop layout, a friendly line and links to Products and Track.

### 8. Checkout and cart on desktop

A single 640 px column is fine, but the order summary scrolls away. From `lg`, form on the left and a sticky order
summary on the right. Mobile stays as is. In the cart, quantity, edit and remove are centred on mobile; align them
left under the price.

### 9. Smaller items

- Product "Details" uses the browser's plain triangle, the FAQ has the custom chevron: use one disclosure
  component (task 25 item 3).
- Sign-in, sign-up and reset are narrow cards floating in a wide cream area; show the short reassurance line
  ("You don't need an account to order") on all three, not only sign-in.
- The About page shows the yellow `TODO(founder)` boxes; hide them in production until the text is written.
- Touch targets: the "Edit design" and "Remove" links in the cart are small; give them a 44 px hit area.

## Suggested order of work

1. Containers + `PageTitle` (1, 4) — small PR, biggest visual win.
2. Step bar on cart/checkout, 404 page, footer (3, 6, 7) — small.
3. Products grid and imagery fixes (5) — small.
4. Desktop layouts for editor, product page, checkout (2, 8) — larger, one PR each.
