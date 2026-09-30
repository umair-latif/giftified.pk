# Design products: publishing, removing, syncing

Each ready-made design is a **WooCommerce simple product** (SKU `design-<id>`) plus files in storage (the design,
sample photos, product images). **WooCommerce decides what is for sale.**

## Removing or hiding a design

In WP admin, **trash / delete / un-publish (draft)** the product. The design disappears from the shop by itself:
the product page returns "not found", and it leaves the product page gallery, the occasion pages, the home page
and the sitemap. Nothing needs deleting in the app.

How fast: up to an hour, because shop pages are cached. It is immediate if the catalog webhook is set up
(**WooCommerce → Settings → Advanced → Webhooks**, topics **Product updated**, **Product created**, **Product
deleted**, delivery URL `<APP_URL>/api/webhooks/catalog`, same secret as `WC_WEBHOOK_SECRET`; see
`woocommerce-staging.md` §7). Trashing sends "Product deleted" (or "updated"), so add all three.

A customer who already has the design in their cart gets "Not available" in the cart and at checkout, and the order
is refused; nothing is charged.

## Cleaning up the files (optional)

Removed designs leave their files in storage. To see and remove them:

```
pnpm exec tsx --conditions=react-server scripts/templates-orphans.ts            # list only
pnpm exec tsx --conditions=react-server scripts/templates-orphans.ts --delete   # also delete their files
```

A design whose product is only a **draft** is not listed (you may still publish it).

## Bringing a design back

Restore the product from the WP trash and publish it: the design page returns with its images (they stay in
storage until cleaned up). If you already ran `--delete`, publish the design again from the editor.

## Changing price, title or description

Edit them in WP admin. The shop pages pick the change up with the same webhook (or within the hour).
