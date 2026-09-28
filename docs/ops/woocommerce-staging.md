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
creates the **Custom Mug** (SKU `mug`, colour White, Rs 1499), and creates city shipping
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

## Troubleshooting

| Message                                   | Fix                                                                                                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REST API not found` / 404                | Settings → Permalinks → **Post name**.                                                                                                                                                                                               |
| `Login refused` / 401 with the right keys | Some hosts strip the login header. Add this line to the site's `.htaccess` (above the WordPress block): `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1` — or ask the host's support to "pass the Authorization header to PHP". |
| `WC_URL must start with https://`         | Turn on SSL for the site (most hosts: one click, "Let's Encrypt").                                                                                                                                                                   |
| `Couldn't reach WC_URL`                   | Typo in the address, or the site is offline.                                                                                                                                                                                         |
