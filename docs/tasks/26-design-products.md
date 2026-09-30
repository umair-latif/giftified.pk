# 26 — Design products: templates you can buy as they are, or customise

**Branch:** `feat/design-products` · **Owner:** Claude (cloud session) · **Needs:** 18, 19

A published template becomes a **product**: `/designs/<slug>` with its own title, description and price.
The customer can **Add to cart** as it is, or **Customize** it in the editor. Only accounts listed in
`TEMPLATE_EDITOR_EMAILS` can publish.

## Decisions (founder)

- **One WooCommerce _simple_ product per published design** (no variations). WooCommerce holds the
  commercial side (title, description, price, sale price, status, categories, image; edited in WP admin
  afterwards). Our storage holds the design side (design.json, layer roles, sample photos). Linked both ways
  (`_template_id` on the product, `wooProductId` on the template).
- Colour and size are chosen on the design page and recorded as **line-item notes**; availability comes from
  the base product's config (no stock). **One price per design** for now (no size surcharges).
- At publish time the editor asks for **title, description, price** (later changes in WP admin).
- Coupons/price per design come from WooCommerce (categories per base product and per occasion; coupon
  code field + server-side validation is its own slice — nothing exists yet).
- The designer marks each layer **locked** (default) or **customizable**. Photos are always customizable
  sample photos for now (locked photos need the original stored: a later slice).
- Later: text boxes should start as wide as their text instead of 60 % of the print area.

## Slices

1. **Layer roles (built).** `customizable` flag on any layer (selection-bar toggle "Customers can edit", editors
   only). `lockLayersForCustomer` stamps `templateLocked` on everything else when a customer starts from a
   template; the editor makes locked layers unselectable (`engine/layer-lock.ts`, re-applied after every
   load/restore). Saving forces photos to be customizable placeholders.
2. **Publish as product (built).** Preview step: editors see **Publish as product** instead of Add to cart → title,
   description, price, occasions → saves the template and creates the WooCommerce simple product
   (`CommerceClient.createProduct`: contract change, lead approval). Idempotent/retryable.
3. **Design page + cart (built).** `/designs/<slug>`: title, description, preview, the base product's Details,
   colour/size, **Add to cart** and **Customize**; after adding: "Customize it" / "Go to cart". Products with
   sample photos say "Add your photo" instead. Cart line carries the template id; the server re-prices from
   the WooCommerce product; order line notes: colour, size, `_template_id`.
4. **Catalog + gallery.** `listProducts` skips design products on `/products`; gallery/occasion cards open
   `/designs/<slug>`. Sitemap, JSON-LD.
5. **Coupons (built).** Coupon code box in the cart and checkout; `priceCart` (`src/server/checkout/pricing.ts`) prices the
   lines from the store then checks the coupon (`src/lib/coupons.ts`, pure) against WooCommerce coupons
   (`CommerceClient.findCoupon`); `placeOrder` re-checks and sends `coupon_lines` so WooCommerce computes the order
   discount. Design products are filed under "Ready-made <product>" + one category per occasion so coupons can
   target them in WP admin. Guide: [`docs/ops/coupons.md`](../ops/coupons.md).
6. **Locked photos** (original stored with the template, copied into the order's files).

## Slice 2 notes

- Editors on the Preview step get **Publish as product** (Add to cart becomes a small "Add to cart instead"
  link). The sheet asks for name, description, price (whole rupees), occasions and publish.
- `publishTemplateProduct` (`src/server/templates/publish.ts`), in this order so a retry is clean:
  1. create the WooCommerce **draft** simple product (`CommerceClient.createDesignProduct`; SKU
     `design-<templateId>`, `catalog_visibility: hidden`, meta `_template_id`, `_base_product`; idempotent on
     the SKU) — if this fails, nothing is saved (HTTP 502 "try again");
  2. save the template with `product: { slug, wooProductId, pricePkr, description }`;
  3. `publishDesignProduct` sets it to publish with the thumbnail as image (WooCommerce downloads it from
     `<APP_URL>/api/templates/<id>/thumbnail`; if it can't, it publishes without an image). A failure here is a
     warning: saved, product still a draft.
- Design products never appear on `/products`: `listProducts` only asks WooCommerce for the base-product SKUs.
- Contract change for lead review: `CommerceClient` gained `createDesignProduct` / `publishDesignProduct`
  (+ `NewDesignProduct`, `DesignProduct`); `TemplateMeta` gained `product`.
- Needs the WooCommerce API key to have **write** access to products (it already writes orders).

## Slice 3 notes

- `/designs/<slug>` (ISR, 5 min): title, description and price come from the **WooCommerce product**
  (`CommerceClient.getDesignProduct`, cached under the catalog tag so WP-admin edits show after the product
  webhook); the thumbnail, colours/sizes (base product config + catalog) and Details come from the base product.
  **Add to cart** (the design as it is) / **Customize** (`/design/<product>?template=<id>`); after adding: Go to
  cart / Customize it. A design that still has sample photos shows **Add your photo** instead.
- Cart: `CartItem.templateId`. "As is" adds the template's design as a saved design (layers stay locked if it is
  edited from the cart). **Customize → Preview → Add to cart** keeps the link too (`draft.ts`
  `setDraftTemplate`, cleared with the draft), so a customised design is still priced as that product.
- Pricing: `quoteCart` and `createOrder` price a `templateId` line from its own WooCommerce simple product (never
  the client, never the base variant); the base product only validates colour/size. The order line gets notes
  `Colour`, `Size` (visible in WP admin) plus `_template_id`, `_base_product`; `mapOrder` reads a design line back
  from those notes (its product is not in the base catalog), so the print pipeline works unchanged.
- The gallery/occasion cards now open `/designs/<slug>` for design products; sitemap lists them.

### Contract changes (need the lead's OK; all additive)

- `src/types/cart.ts` `CartItem.templateId?`; `src/types/order.ts` `OrderLineInput.templateId?`
  (so `OrderLine` too).
- `src/lib/commerce/types.ts`: `CommerceClient.createDesignProduct`, `getDesignProduct`,
  `publishDesignProduct`; `NewDesignProduct`, `DesignProduct`, `DesignProductInfo`.
- `src/server/templates/types.ts`: `TemplateMeta.product`, `SaveTemplateInput.id/product`.

### Not done yet

Cart/checkout show the base product name for design lines (not the design's title); the vendor proof does not
print the design title; coupons; locked photos; text boxes that start as wide as their text.

## Slice 5 notes (coupons)

- Contract (additive, lead OK needed): `CommerceClient.findCoupon`, `CatalogProduct.categoryIds?`,
  `DesignProductInfo.categoryIds?`, `NewDesignProduct.categories?`, `CreateOrderInput.couponCode?`,
  `Order.discountPkr?`.
- Not supported: email-restricted coupons (refused), per-customer limits, "exclude sale items".
- The mock store ships a demo coupon `WELCOME10` (10 % off everything) for local development and the e2e tests.

## Product images and design titles (follow-up)

- **Product images:** Publishing as a product now stores the design's mockups (every view of the product's
  mockup set: front / left / right / lifestyle / flat lay) plus the flat artwork as `templates/<id>/images/<n>.webp`
  (`TemplateMeta.images` = labels, in order). `GET /api/templates/<id>/images/<n>` serves them (published only);
  `/designs/<slug>` shows them as a gallery; WooCommerce gets the same URLs as the product's images
  (`publishDesignProduct(id, { imageUrls })`); the gallery card / cart thumbnail is the first mockup, small.
  Older designs without images fall back to the thumbnail. The request stays under Vercel's 4.5 MB limit
  (images ≤ 1080 px WebP).
- **Design title:** cart and checkout lines show the design's title (product name beneath it) — `priceCart`
  returns `lineTitles`. The vendor proof shows "Design: <title>" in place of the (already large) quantity row;
  `VendorProofInput.designTitle?` is the only contract change.
