# WooCommerce test store — setup guide

A test ("staging") WooCommerce store lets the app create real orders without touching
customers. It takes about 20 minutes. You'll need: a WordPress site on **HTTPS**, the
WooCommerce plugin, and one API key. A script does the rest.

## 1. Get a WordPress site with HTTPS

WooCommerce only accepts the app's key login over **https://**, so a plain-HTTP or
local site won't work.

- **Quickest:** a disposable WordPress site from a service such as InstaWP (paid per
  day while it exists; plans with SSL start around $5/month).
- **Better long-term:** normal WordPress hosting with a free SSL certificate, on a
  subdomain like `shop.giftified.pk`. You'll need this for launch anyway (it becomes the
  order back office), so the test store can simply be this site before launch.

## 2. Install WooCommerce

1. WP admin → **Plugins → Add New** → search **WooCommerce** → **Install** → **Activate**.
2. Skip the setup wizard; the script configures what we need.
3. WP admin → **Settings → Permalinks** → choose **Post name** → **Save**.
   (Without this the API address `/wp-json/…` returns "not found".)

## 3. Create the API key

1. WP admin → **WooCommerce → Settings → Advanced → REST API → Add key**.
2. Description `Giftified app`, User: your admin, Permissions: **Read/Write** → **Generate**.
3. Copy the **Consumer key** (`ck_…`) and **Consumer secret** (`cs_…`) now — they are shown only once.

## 4. Put the settings in `.env.local`

In the project folder, create a file called `.env.local` (it is git-ignored, never commit it):

```
WC_URL=https://your-test-site.example
WC_CONSUMER_KEY=ck_...
WC_CONSUMER_SECRET=cs_...
WC_WEBHOOK_SECRET=paste-a-long-random-string
```

Make the webhook secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Never paste keys into chat or commit them. If a key leaks, revoke it in the same REST API screen.

## 5. Set up the store automatically

```powershell
pnpm woo:seed
```

This sets the country to Pakistan and the currency to PKR, turns on **Cash on Delivery**,
creates the global **Colour** attribute (White `#FFFFFF`, Black `#171717`), the **Custom Mug**
(SKU `mug`, colour White, Rs 1499), the **Custom T-Shirt** (SKU `tshirt`, Colour White/Black ×
Size S–XXL = 10 variations, **placeholder** Rs 1999 until the vendor price is agreed; change the
price and sizes in WP admin), the **Custom Hoodie** as a **draft** (SKU `hoodie`, Colour
White/Heather Grey × Size S–XXL, placeholder Rs 3499; publish it in WP admin once the vendor has
confirmed the print size), and creates city shipping
zones: Lahore, Karachi, Islamabad/Rawalpindi, Gujrat/Sialkot/Jhelum, and Rest of Pakistan.
It's safe to run again: it only adds what's missing.

Change prices and delivery rates later in WP admin as you like. Keep the rule that
**shipping zone names list their cities** separated by commas (e.g. `Multan, Bahawalpur`);
that's how the app picks the rate. A city not in any zone uses "Rest of Pakistan".

## 6. Check it works

```powershell
pnpm woo:smoke
```

This reads the catalogue, gets a delivery quote for Lahore, and creates **one test order**.
Look for it in WP admin → **WooCommerce → Orders** (status _On hold_, customer "Smoke Test"),
then cancel or delete it.

From now on, `pnpm dev` uses this store instead of the built-in test store (because
`WC_URL` is set). Remove or comment out `WC_URL` in `.env.local` to go back to the fake store.

## 7. Later: webhooks (after the app is online)

WooCommerce tells the app about order changes via webhooks, which need the app's public
HTTPS address. Once the app is deployed:

```powershell
pnpm woo:seed --webhook-url=https://YOUR-APP-ADDRESS/api/webhooks/commerce
```

Then add a second webhook so the shop pages update within seconds when you change a
product (price, photos, description, colours). In WP admin → **WooCommerce → Settings →
Advanced → Webhooks → Add webhook**:

| Field        | Value                                           |
| ------------ | ----------------------------------------------- |
| Name         | Giftified catalog                               |
| Status       | Active                                          |
| Topic        | **Product updated**                             |
| Delivery URL | `https://YOUR-APP-ADDRESS/api/webhooks/catalog` |
| Secret       | the same value as `WC_WEBHOOK_SECRET`           |
| API version  | WP REST API Integration v3                      |

Also add the same webhook with topics **Product created** and **Product deleted** (or one webhook per topic): design
products you delete or trash in WP admin then leave the shop within seconds (`design-products.md`).
Without these webhooks the shop pages still update, just up to an hour later.

## 8. Products: photos, descriptions and colours

What customers see on `/products` and each product page comes from WP admin → **Products**:

- **Name, price** — as usual. The "from" price is the cheapest variation.
- **Photos** — _Product image_ and _Product gallery_. The first image is the main one.
- **Short description** — one or two sentences for cards and search results.
- **Description** — shown under _Details_. Paragraphs, lists, **bold** and _italic_ are kept;
  links, colours, fonts and embedded media are removed.
- **SKU** must stay `mug` / `tshirt` / `hoodie`; that's how the app knows which product it is.
  The product's **slug** (Permalink) becomes the address, e.g. `/products/custom-mug`.

**Colours:** WP admin → **Products → Attributes → Colour → Configure terms**. Each colour is a
term; put its swatch colour in the term's **Description** as a hex code, e.g. `#FFFFFF` or
`#1E3A8A`. Then add the colour to the product (Attributes tab → Colour → select terms) and
create a variation for it with a price. A colour without a hex code shows a grey dot.

A product with the old per-product "Colour" attribute (created before this) keeps working;
it just uses the swatches from the app's product settings.

## Troubleshooting

| Message                                   | Fix                                                                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REST API not found` / 404                | Settings → Permalinks → **Post name**.                                                                                                                                                                                               |
| `Login refused` / 401 with the right keys | Some hosts strip the login header. Add this line to the site's `.htaccess` (above the WordPress block): `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` — or ask the host's support to "pass the Authorization header to PHP". |
| `WC_URL must start with https://`         | Turn on SSL for the site (most hosts: one click, "Let's Encrypt").                                                                                                                                                                   |
| `Couldn't reach WC_URL`                   | Typo in the address, or the site is offline.                                                                                                                                                                                         |
