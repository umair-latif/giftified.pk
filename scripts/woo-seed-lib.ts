/**
 * Sets up a WooCommerce store the way Giftified.pk expects (see
 * docs/ops/woocommerce-staging.md). Idempotent: running it again only fills
 * in what's missing and never duplicates products, zones or webhooks.
 */

export interface SeedConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  /** If set, also registers order.created / order.updated webhooks to this URL. */
  webhookUrl?: string;
  webhookSecret?: string;
  fetch?: typeof fetch;
  log?: (line: string) => void;
}

/** WooCommerce store location: Pakistan, Punjab (Gujrat/Lahore). */
export const STORE_COUNTRY = "PK:PB";

export const MUG = {
  sku: "mug",
  name: "Custom Mug",
  colour: "White",
  pricePkr: 1499,
};

/** Zone names list their cities — that's how the app matches a city to a rate. */
export const ZONES: readonly { name: string; costPkr: number }[] = [
  { name: "Lahore", costPkr: 200 },
  { name: "Karachi", costPkr: 250 },
  { name: "Islamabad, Rawalpindi", costPkr: 250 },
  { name: "Gujrat, Sialkot, Jhelum", costPkr: 150 },
  { name: "Rest of Pakistan", costPkr: 300 },
];

type Json = Record<string, unknown>;

export async function seedWooCommerce(cfg: SeedConfig): Promise<void> {
  const doFetch = cfg.fetch ?? fetch;
  const log = cfg.log ?? console.log;
  const base = `${cfg.url.replace(/\/+$/, "")}/wp-json/wc/v3`;
  const auth = `Basic ${Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64")}`;

  async function call<T = Json>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await doFetch(base + path, {
      method,
      headers: {
        Authorization: auth,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    if (!res.ok)
      throw new Error(
        `${method} ${path} → ${res.status}: ${text.slice(0, 300)}`,
      );
    return (text ? JSON.parse(text) : null) as T;
  }

  // 1. Store basics: Pakistan (Punjab), rupees without decimals.
  // For countries with provinces WooCommerce only accepts "COUNTRY:STATE",
  // e.g. "PK:PB" (Punjab); plain "PK" is rejected with 400.
  // The store address isn't used by the app, so a refusal here is only a warning.
  try {
    await call("PUT", "/settings/general/woocommerce_default_country", {
      value: STORE_COUNTRY,
    });
    log(`✓ Store location ${STORE_COUNTRY} (Pakistan, Punjab)`);
  } catch (err) {
    log(
      `! Couldn't set the store location (${err instanceof Error ? err.message : String(err)}). ` +
        "Set it by hand in WooCommerce → Settings → General; the app doesn't depend on it.",
    );
  }
  await call("PUT", "/settings/general/woocommerce_currency", { value: "PKR" });
  await call("PUT", "/settings/general/woocommerce_price_num_decimals", {
    value: "0",
  });
  log("✓ Currency PKR, no decimals");

  // 2. Cash on Delivery on.
  await call("PUT", "/payment_gateways/cod", { enabled: true });
  log("✓ Cash on Delivery enabled");

  // 3. Mug: variable product, SKU "mug", Colour attribute, White variation.
  const existing = await call<Json[]>("GET", `/products?sku=${MUG.sku}`);
  let product = existing[0];
  if (!product) {
    product = await call<Json>("POST", "/products", {
      name: MUG.name,
      type: "variable",
      sku: MUG.sku,
      status: "publish",
      attributes: [
        {
          name: "Colour",
          visible: true,
          variation: true,
          options: [MUG.colour],
        },
      ],
    });
    log(`✓ Created product "${MUG.name}" (SKU ${MUG.sku})`);
  } else {
    log(
      `• Product with SKU ${MUG.sku} already exists (id ${String(product.id)})`,
    );
  }
  const productId = String(product.id);
  const variations = await call<Json[]>(
    "GET",
    `/products/${productId}/variations`,
  );
  const hasColour = variations.some((v) =>
    (v.attributes as { option?: string }[] | undefined)?.some(
      (a) => a.option === MUG.colour,
    ),
  );
  if (!hasColour) {
    await call("POST", `/products/${productId}/variations`, {
      regular_price: String(MUG.pricePkr),
      status: "publish",
      attributes: [{ name: "Colour", option: MUG.colour }],
    });
    log(`✓ Added variation ${MUG.colour} at Rs ${MUG.pricePkr}`);
  } else {
    log(`• Variation ${MUG.colour} already exists`);
  }

  // 4. Shipping zones by city, each with a flat rate.
  const zones = await call<{ id: number; name: string }[]>(
    "GET",
    "/shipping/zones",
  );
  for (const want of ZONES) {
    let zone = zones.find(
      (z) => z.name.trim().toLowerCase() === want.name.toLowerCase(),
    );
    if (!zone) {
      zone = await call<{ id: number; name: string }>(
        "POST",
        "/shipping/zones",
        { name: want.name },
      );
      await call("PUT", `/shipping/zones/${zone.id}/locations`, [
        { code: "PK", type: "country" },
      ]);
      log(`✓ Created shipping zone "${want.name}"`);
    }
    const methods = await call<{ method_id: string }[]>(
      "GET",
      `/shipping/zones/${zone.id}/methods`,
    );
    if (!methods.some((m) => m.method_id === "flat_rate")) {
      const m = await call<{ instance_id: number }>(
        "POST",
        `/shipping/zones/${zone.id}/methods`,
        {
          method_id: "flat_rate",
          enabled: true,
        },
      );
      await call("PUT", `/shipping/zones/${zone.id}/methods/${m.instance_id}`, {
        settings: { title: "Delivery", cost: String(want.costPkr) },
      });
      log(`✓ Flat rate Rs ${want.costPkr} for "${want.name}"`);
    } else {
      log(`• "${want.name}" already has a flat rate (not changed)`);
    }
  }

  // 5. Optional: webhooks to the app (needs the app's public HTTPS URL).
  if (cfg.webhookUrl) {
    if (!cfg.webhookSecret)
      throw new Error("WC_WEBHOOK_SECRET is required to create webhooks");
    const hooks = await call<{ topic: string; delivery_url: string }[]>(
      "GET",
      "/webhooks",
    );
    for (const topic of ["order.created", "order.updated"]) {
      if (
        hooks.some(
          (h) => h.topic === topic && h.delivery_url === cfg.webhookUrl,
        )
      ) {
        log(`• Webhook ${topic} already exists`);
        continue;
      }
      await call("POST", "/webhooks", {
        name: `Giftified ${topic}`,
        topic,
        delivery_url: cfg.webhookUrl,
        secret: cfg.webhookSecret,
        status: "active",
      });
      log(`✓ Webhook ${topic} → ${cfg.webhookUrl}`);
    }
  }

  log(
    "Done. Check WP admin → Products, and WooCommerce → Settings → Shipping / Payments.",
  );
}
