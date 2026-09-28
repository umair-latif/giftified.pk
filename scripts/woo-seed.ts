/**
 * pnpm woo:seed                      — set up the store in .env.local's WC_URL
 * pnpm woo:seed --webhook-url=https://your-app.example/api/webhooks/commerce
 */
import { loadEnvConfig } from "@next/env";
import { seedWooCommerce } from "./woo-seed-lib";

loadEnvConfig(process.cwd());
const { WC_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, WC_WEBHOOK_SECRET } =
  process.env;

if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
  console.error(
    "Set WC_URL, WC_CONSUMER_KEY and WC_CONSUMER_SECRET in .env.local first.",
  );
  process.exit(1);
}
if (!WC_URL.startsWith("https://")) {
  console.error(
    "WC_URL must start with https:// (WooCommerce only allows key login over HTTPS).",
  );
  process.exit(1);
}

const webhookArg = process.argv.find((a) => a.startsWith("--webhook-url="));
const webhookUrl = webhookArg?.slice("--webhook-url=".length);

seedWooCommerce({
  url: WC_URL,
  consumerKey: WC_CONSUMER_KEY,
  consumerSecret: WC_CONSUMER_SECRET,
  webhookUrl,
  webhookSecret: WC_WEBHOOK_SECRET,
}).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("✗", msg);
  if (msg === "fetch failed")
    console.error(
      "  Couldn't reach WC_URL — check the address and that the site is online.",
    );
  else if (/→ 401/.test(msg))
    console.error(
      "  Login refused — check the key/secret, that the key has Read/Write, and see Troubleshooting in docs/ops/woocommerce-staging.md.",
    );
  else if (/→ 404/.test(msg))
    console.error(
      "  REST API not found — set WP admin → Settings → Permalinks to “Post name”.",
    );
  process.exit(1);
});
