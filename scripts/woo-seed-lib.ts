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

export const MUG = {
  sku: "mug",
  name: "Custom Mug",
  colour: "White",
  pricePkr: 1499,
};

/**
 * T-shirt: variable product, Colour (global) × Size (local) = 10 variations.
 * Price and sizes are PLACEHOLDERS until the founder confirms them with the
 * vendor (docs/tasks/27-tshirt.md); change them in WP admin, not here, once live.
 */
export const TSHIRT = {
  sku: "tshirt",
  name: "Custom T-Shirt",
  colours: ["White", "Black"],
  sizes: ["S", "M", "L", "XL", "XXL"],
  pricePkr: 1999,
  status: "publish",
};

/**
 * Hoodie (task 28): same shape as the T-shirt, created as a DRAFT so customers
 * don't see it until the founder publishes it in WP admin (after the vendor
 * confirms the print size). Price is a PLACEHOLDER; change it in WP admin.
 */
export const HOODIE = {
  sku: "hoodie",
  name: "Custom Hoodie",
  colours: ["White", "Heather Grey"],
  sizes: ["S", "M", "L", "XL", "XXL"],
  pricePkr: 3499,
  status: "draft",
};

/**
 * Colours as terms of the GLOBAL attribute "Colour" (pa_colour). The term
 * description holds the swatch hex; the storefront reads it (task 11), so the
 * founder can add a colour in WP admin → Products → Attributes without code.
 */
export const COLOURS: readonly { name: string; hex: `#${string}` }[] = [
  { name: "White", hex: "#FFFFFF" },
  { name: "Black", hex: "#171717" },
  { name: "Heather Grey", hex: "#B4B7BC" },
];

/**
 * Cash on Delivery texts. Written on every run: when COD is switched on in a
 * store whose WordPress is set to another language, WooCommerce saves its
 * translated defaults (German on IONOS), and the Instructions line appears in
 * every order email. The customer never sees the WordPress checkout, so only
 * Instructions matters; Title/Description are kept English for WP admin.
 */
export const COD_TEXTS = {
  title: "Cash on Delivery",
  description: "Pay in cash when your order arrives.",
  instructions:
    "Pay in cash when your order arrives. We'll call or message you to confirm your order before we print it.",
} as const;

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

  // 1. Store basics: Pakistan, rupees without decimals. WooCommerce knows
  // Pakistan's provinces, so the country must be "country:state" ("PK" alone
  // is rejected as invalid); Punjab, where our print partners are. A store
  // setting that won't save is reported, not fatal: products come next.
  const settings: [string, string, string][] = [
    [
      "woocommerce_default_country",
      "PK:PB",
      "Country / State → Pakistan — Punjab",
    ],
    ["woocommerce_currency", "PKR", "Currency → Pakistani rupee"],
    ["woocommerce_price_num_decimals", "0", "Number of decimals → 0"],
  ];
  let settingsOk = true;
  for (const [id, value, manual] of settings) {
    try {
      await call("PUT", `/settings/general/${id}`, { value });
    } catch (err) {
      settingsOk = false;
      log(
        `! Couldn't set ${id} (${err instanceof Error ? err.message : String(err)}). ` +
          `Set it by hand: WP admin → WooCommerce → Settings → General → ${manual}.`,
      );
    }
  }
  if (settingsOk) log("✓ Store country Pakistan, currency PKR, no decimals");

  // 2. Cash on Delivery on, with English texts (see COD_TEXTS).
  await call("PUT", "/payment_gateways/cod", {
    enabled: true,
    title: COD_TEXTS.title,
    description: COD_TEXTS.description,
    settings: { instructions: COD_TEXTS.instructions },
  });
  log("✓ Cash on Delivery enabled (English title, description, email instructions)");

  // 3a. Global Colour attribute with one term per colour (description = hex).
  type Attr = { id: number; name: string; slug: string };
  type Term = { id: number; name: string; description?: string };
  const attrs = await call<Attr[]>("GET", "/products/attributes");
  let colourAttr = attrs.find(
    (a) => a.slug === "pa_colour" || a.name.trim().toLowerCase() === "colour",
  );
  if (!colourAttr) {
    colourAttr = await call<Attr>("POST", "/products/attributes", {
      name: "Colour",
      slug: "colour",
      type: "select",
      order_by: "menu_order",
      has_archives: false,
    });
    log(`✓ Created global attribute "Colour" (id ${colourAttr.id})`);
  } else {
    log(`• Global attribute "Colour" exists (id ${colourAttr.id})`);
  }
  const termsPath = `/products/attributes/${colourAttr.id}/terms`;
  const terms = await call<Term[]>("GET", `${termsPath}?per_page=100`);
  for (const c of COLOURS) {
    const term = terms.find(
      (t) => t.name.trim().toLowerCase() === c.name.toLowerCase(),
    );
    if (!term) {
      await call("POST", termsPath, { name: c.name, description: c.hex });
      log(`✓ Colour "${c.name}" ${c.hex}`);
    } else if (!/#?[0-9a-f]{3,6}/i.test(term.description ?? "")) {
      await call("PUT", `${termsPath}/${term.id}`, { description: c.hex });
      log(`✓ Colour "${c.name}": set swatch ${c.hex}`);
    } else {
      log(`• Colour "${c.name}" exists (not changed)`);
    }
  }

  // 3b. Mug: variable product, SKU "mug", global Colour attribute, White variation.
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
          id: colourAttr.id,
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
    // A product created before 3a has a LOCAL "Colour" attribute (id 0); keep
    // using it. Colours then fall back to src/config/products in the storefront.
    const usesGlobal = (
      product.attributes as { id?: number }[] | undefined
    )?.some((a) => a.id === colourAttr.id);
    await call("POST", `/products/${productId}/variations`, {
      regular_price: String(MUG.pricePkr),
      status: "publish",
      attributes: [
        usesGlobal
          ? { id: colourAttr.id, name: "Colour", option: MUG.colour }
          : { name: "Colour", option: MUG.colour },
      ],
    });
    log(`✓ Added variation ${MUG.colour} at Rs ${MUG.pricePkr}`);
  } else {
    log(`• Variation ${MUG.colour} already exists`);
  }

  // 3c. Garments: variable products, global Colour + local Size, one variation per pair.
  for (const g of [TSHIRT, HOODIE]) {
    const label = g.name.replace(/^Custom /, "");
    const found = await call<Json[]>(
      "GET",
      `/products?sku=${g.sku}&status=any`,
    );
    let product = found[0];
    if (!product) {
      product = await call<Json>("POST", "/products", {
        name: g.name,
        type: "variable",
        sku: g.sku,
        status: g.status,
        attributes: [
          {
            id: colourAttr.id,
            visible: true,
            variation: true,
            options: g.colours,
          },
          { name: "Size", visible: true, variation: true, options: g.sizes },
        ],
      });
      log(
        `✓ Created product "${g.name}" (SKU ${g.sku}${g.status === "draft" ? ", draft: publish it in WP admin when ready" : ""})`,
      );
    } else {
      log(
        `• Product with SKU ${g.sku} already exists (id ${String(product.id)})`,
      );
    }
    const productId = String(product.id);
    const vars = await call<Json[]>("GET", `/products/${productId}/variations`);
    const have = new Set(
      vars.map((v) =>
        (
          (v.attributes as { name?: string; option?: string }[] | undefined) ??
          []
        )
          .map((a) => `${(a.name ?? "").toLowerCase()}=${a.option ?? ""}`)
          .sort()
          .join("|"),
      ),
    );
    let added = 0;
    for (const colour of g.colours) {
      for (const size of g.sizes) {
        const key = [`colour=${colour}`, `size=${size}`].sort().join("|");
        if (have.has(key)) continue;
        await call("POST", `/products/${productId}/variations`, {
          regular_price: String(g.pricePkr),
          status: "publish",
          attributes: [
            { id: colourAttr.id, name: "Colour", option: colour },
            { name: "Size", option: size },
          ],
        });
        added++;
      }
    }
    log(
      added
        ? `✓ Added ${added} ${label} variations at Rs ${g.pricePkr} (placeholder price)`
        : `• All ${label} variations already exist`,
    );
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
