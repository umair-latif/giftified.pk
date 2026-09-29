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
3. **Design page + cart.** `/designs/<slug>`: title, description, preview, the base product's Details,
   colour/size, **Add to cart** and **Customize**; after adding: "Customize it" / "Go to cart". Products with
   sample photos say "Add your photo" instead. Cart line carries the template id; the server re-prices from
   the WooCommerce product; order line notes: colour, size, `_template_id`.
4. **Catalog + gallery.** `listProducts` skips design products on `/products`; gallery/occasion cards open
   `/designs/<slug>`. Sitemap, JSON-LD.
5. **Coupons** (code field, validation against WooCommerce coupons, discount in the quote and on the order).
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
