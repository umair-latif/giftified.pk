import "server-only";
import { z } from "zod";
import type { ProductId } from "@/config/products";
import type { Coupon } from "@/lib/coupons";
import type { CreateOrderInput, Order, OrderId } from "@/types/order";
import type {
  CatalogProduct,
  CommerceClient,
  Customer,
  CustomerOrderPage,
  DesignProduct,
  DesignProductInfo,
  NewDesignProduct,
  ShippingQuote,
} from "./types";
import {
  META,
  PRODUCT_SKUS,
  buildOrderBody,
  colourHexesFromTerms,
  descriptionHtml,
  isColourAttribute,
  isProductId,
  findVariant,
  mapCoupon,
  mapOrder,
  mapProduct,
  mapRetentionOrder,
  metaValue,
  parsePkr,
  quoteFromZones,
  regularIfReduced,
  sanitizeHtml,
  type ResolvedLine,
  type ZoneWithRates,
} from "./woo-map";
import {
  wooAttributeTermSchema,
  wooCategorySchema,
  wooCouponSchema,
  wooCustomerSchema,
  wooOrderSchema,
  wooProductSchema,
  wooRetentionOrderSchema,
  wooShippingZoneSchema,
  wooVariationSchema,
  wooZoneMethodSchema,
  type WooCustomer,
  type WooOrder,
  type WooProduct,
  type WooVariation,
} from "./woo-schemas";
import { verifyWooWebhook } from "./woo-webhook";
import { assertSavedDesignList, parseSavedDesigns } from "./saved-designs";

/**
 * Real CommerceClient on headless WooCommerce (REST API v3).
 * Server-only: consumer key/secret must never reach a client bundle.
 */

export interface WooConfig {
  /** Store root, e.g. https://admin.giftified.pk (no /wp-json suffix). */
  url: string;
  consumerKey: string;
  consumerSecret: string;
  webhookSecret: string;
  /** Injected in tests; defaults to global fetch (with Next caching). */
  fetch?: typeof fetch;
  /** Injected in tests; ms since epoch. */
  now?: () => number;
}

/** WordPress sends names HTML-escaped ("Mugs &amp; Cups") and compares them case-insensitively. */
function sameCategoryName(a: string, b: string): boolean {
  const norm = (x: string) =>
    x
      .replace(/&amp;/g, "&")
      .replace(/&#0?39;|&#8217;/g, "'")
      .trim()
      .toLowerCase();
  return norm(a) === norm(b);
}

export class WooCommerceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "WooCommerceError";
  }
}

/**
 * Catalog reads are cached for an hour under one tag; the `product.*` webhook
 * (`/api/webhooks/catalog`) revalidates the tag so edits in WP admin show within
 * seconds. Prices are re-checked by WC on every order anyway.
 */
export const CATALOG_CACHE_TAG = "catalog";
const CATALOG_CACHE = { revalidate: 3600, tags: [CATALOG_CACHE_TAG] };
const SHIPPING_TTL_MS = 10 * 60 * 1000;
/** How far back createOrder looks for an order with the same checkoutId. */
const IDEMPOTENCY_WINDOW_MS = 48 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const TIMEOUT_MS = 15_000;

const envSchema = z.object({
  WC_URL: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), {
      message:
        "WC_URL must be https (WooCommerce only accepts Basic auth over TLS)",
    }),
  WC_CONSUMER_KEY: z.string().min(1),
  WC_CONSUMER_SECRET: z.string().min(1),
  WC_WEBHOOK_SECRET: z.string().min(1),
});

export function wooConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): WooConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`WooCommerce env is incomplete or invalid: ${fields}`);
  }
  const e = parsed.data;
  return {
    url: e.WC_URL,
    consumerKey: e.WC_CONSUMER_KEY,
    consumerSecret: e.WC_CONSUMER_SECRET,
    webhookSecret: e.WC_WEBHOOK_SECRET,
  };
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOpts {
  query?: Query;
  body?: unknown;
  /** Seconds of Next data-cache for GETs; omitted = never cached. */
  revalidate?: number;
  /** Next cache tags for GETs (for on-demand revalidation). */
  tags?: string[];
}

function mapCustomer(c: WooCustomer): Customer {
  const b = c.billing;
  const landmark = b?.address_2.trim();
  return {
    ...(b?.phone.trim() ? { phone: b.phone.trim() } : {}),
    ...(b?.address_1.trim()
      ? {
          address: {
            city: b.city.trim(),
            addressLine: b.address_1.trim(),
            ...(landmark ? { landmark } : {}),
          },
        }
      : {}),
    ...(metaValue(c.meta_data, META.marketingOptIn) === "yes"
      ? { marketingOptIn: true }
      : {}),
    id: c.id,
    email: c.email.toLowerCase(),
    firstName: c.first_name,
    lastName: c.last_name,
    modifiedAt: c.date_modified_gmt ?? "",
  };
}

/** Customer orders per page on /account/orders. */
const CUSTOMER_ORDERS_PAGE = 20;

/** WooCommerce error codes for "this email/username is taken". */
const EXISTS_CODES = new Set([
  "registration-error-email-exists",
  "registration-error-username-exists",
]);

export function createWooCommerceClient(config: WooConfig): CommerceClient {
  const doFetch = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  const base = `${config.url.replace(/\/+$/, "")}/wp-json/wc/v3`;
  const auth = `Basic ${Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64")}`;

  async function request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    opts: RequestOpts = {},
  ): Promise<{ json: unknown; headers: Headers }> {
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(opts.query ?? {}))
      if (v !== undefined) url.searchParams.set(k, String(v));

    const init: RequestInit = {
      method,
      headers: {
        Authorization: auth,
        Accept: "application/json",
        ...(opts.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      ...(method === "GET" && opts.revalidate !== undefined
        ? {
            next: {
              revalidate: opts.revalidate,
              ...(opts.tags ? { tags: opts.tags } : {}),
            },
          }
        : { cache: "no-store" as const }),
    };

    const res = await doFetch(url, init);
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON error pages from the host */
    }
    if (!res.ok) {
      const err = z
        .object({ code: z.string().optional(), message: z.string().optional() })
        .safeParse(json);
      const code = err.success ? err.data.code : undefined;
      const msg = err.success ? err.data.message : undefined;
      throw new WooCommerceError(
        `WooCommerce ${method} ${path} failed (${res.status})${msg ? `: ${msg}` : ""}`,
        res.status,
        code,
      );
    }
    return { json, headers: res.headers };
  }

  async function get<T>(
    path: string,
    schema: z.ZodType<T>,
    opts: RequestOpts = {},
  ): Promise<T> {
    const { json } = await request("GET", path, opts);
    return schema.parse(json);
  }

  /** Follows WC pagination (X-WP-TotalPages) up to MAX_PAGES. */
  async function getAll<T>(
    path: string,
    schema: z.ZodType<T>,
    opts: RequestOpts = {},
  ): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { json, headers } = await request("GET", path, {
        ...opts,
        query: { ...opts.query, per_page: PAGE_SIZE, page },
      });
      const items = z.array(schema).parse(json);
      out.push(...items);
      const total = Number(headers.get("x-wp-totalpages") ?? "1");
      if (items.length < PAGE_SIZE || page >= total) break;
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Catalog
  // -------------------------------------------------------------------------

  async function withVariations(p: WooProduct): Promise<CatalogProduct | null> {
    const variations =
      p.type === "variable"
        ? await getAll(`/products/${p.id}/variations`, wooVariationSchema, {
            ...CATALOG_CACHE,
          })
        : [];
    return mapProduct(p, variations, await colourHexes(variations));
  }

  /**
   * Hexes for the global Colour attribute (term description = "#RRGGBB").
   * Variations name the attribute by its id when it is global (id > 0); a
   * local "Colour" attribute has id 0 and simply gets the config fallback.
   */
  async function colourHexes(variations: WooVariation[]) {
    const ids = new Set<number>();
    for (const v of variations)
      for (const a of v.attributes)
        if (a.id && isColourAttribute(a.name)) ids.add(a.id);
    const terms = await Promise.all(
      [...ids].map((id) =>
        getAll(`/products/attributes/${id}/terms`, wooAttributeTermSchema, {
          ...CATALOG_CACHE,
        }).catch(() => []),
      ),
    );
    return colourHexesFromTerms(terms.flat());
  }

  async function listProducts(): Promise<CatalogProduct[]> {
    const products = await getAll("/products", wooProductSchema, {
      query: { status: "publish", sku: PRODUCT_SKUS.join(",") },
      ...CATALOG_CACHE,
    });
    const mapped = await Promise.all(products.map(withVariations));
    return mapped.filter((p): p is CatalogProduct => p !== null);
  }

  // -------------------------------------------------------------------------
  // Design products (task 26): one SIMPLE product per published design.
  // SKU `design-<templateId>` keeps them off the base-product catalog.
  // -------------------------------------------------------------------------

  const designSku = (templateId: string) => `design-${templateId}`;

  /** Category ids for these names, creating the ones WooCommerce doesn't have yet. */
  async function ensureCategories(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const name of new Set(names.map((n) => n.trim()).filter(Boolean))) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug) continue;
      const found = await get(
        "/products/categories",
        z.array(wooCategorySchema),
        {
          query: { slug },
        },
      );
      const hit = found.find((c) => c.slug === slug);
      if (hit) {
        ids.push(hit.id);
        continue;
      }
      try {
        const { json } = await request("POST", "/products/categories", {
          body: { name },
        });
        ids.push(wooCategorySchema.parse(json).id);
      } catch (err) {
        // A category with this name already exists under another slug (made
        // or renamed by hand in WP admin): WordPress refuses a second one with
        // `term_exists`. Use the existing one, found by its name.
        if (!(err instanceof WooCommerceError) || err.code !== "term_exists")
          throw err;
        const same = (
          await get("/products/categories", z.array(wooCategorySchema), {
            query: { search: name },
          })
        ).find((c) => sameCategoryName(c.name, name));
        if (!same) throw err;
        ids.push(same.id);
      }
    }
    return ids;
  }

  async function findCoupon(code: string): Promise<Coupon | null> {
    const wanted = code.trim().toLowerCase();
    if (!wanted || wanted.length > 60) return null;
    const found = await get("/coupons", z.array(wooCouponSchema), {
      query: { code: wanted },
    });
    const c = found.find((x) => x.code.trim().toLowerCase() === wanted);
    return c ? mapCoupon(c) : null;
  }

  async function createDesignProduct(
    input: NewDesignProduct,
  ): Promise<DesignProduct> {
    const sku = designSku(input.templateId);
    const found = await get("/products", z.array(wooProductSchema), {
      query: { sku, status: "any" },
    });
    const existing = found.find((p) => p.sku === sku);
    if (existing)
      return { wooProductId: existing.id, slug: existing.slug || sku };
    const { json } = await request("POST", "/products", {
      body: {
        name: input.name,
        type: "simple",
        status: "draft",
        sku,
        regular_price: String(input.pricePkr),
        description: descriptionHtml(input.description),
        manage_stock: false,
        stock_status: "instock",
        ...(input.categories?.length
          ? {
              categories: (await ensureCategories(input.categories)).map(
                (id) => ({ id }),
              ),
            }
          : {}),
        // Sold through our storefront, never through WordPress pages.
        catalog_visibility: "hidden",
        meta_data: [
          { key: META.templateId, value: input.templateId },
          { key: META.baseProduct, value: input.baseProductId },
        ],
      },
    });
    const created = wooProductSchema.parse(json);
    return { wooProductId: created.id, slug: created.slug || sku };
  }

  /** A published design product from WooCommerce, or null when it isn't a valid one. */
  function toDesignInfo(
    p: WooProduct,
    templateId: string,
  ): DesignProductInfo | null {
    const sku = designSku(templateId);
    const pricePkr = parsePkr(p.price);
    const base = metaValue(p.meta_data ?? [], META.baseProduct);
    if (
      p.sku !== sku ||
      p.status !== "publish" ||
      pricePkr === null ||
      !base ||
      !isProductId(base)
    )
      return null;
    return {
      wooProductId: p.id,
      templateId,
      slug: p.slug || sku,
      baseProductId: base,
      name: p.name,
      descriptionHtml: sanitizeHtml(p.description ?? ""),
      pricePkr,
      ...regularIfReduced(p.regular_price, pricePkr),
      ...(p.images[0] ? { imageUrl: p.images[0].src } : {}),
      ...(p.categories?.length
        ? { categoryIds: p.categories.map((c) => c.id) }
        : {}),
    };
  }

  async function getDesignProduct(
    templateId: string,
  ): Promise<DesignProductInfo | null> {
    const found = await get("/products", z.array(wooProductSchema), {
      query: { sku: designSku(templateId), status: "publish" },
      ...CATALOG_CACHE,
    });
    for (const p of found) {
      const info = toDesignInfo(p, templateId);
      if (info) return info;
    }
    return null;
  }

  async function listDesignProducts(
    templateIds: string[],
  ): Promise<DesignProductInfo[]> {
    const out: DesignProductInfo[] = [];
    // WooCommerce filters by a comma-separated list of SKUs; keep URLs short.
    for (let i = 0; i < templateIds.length; i += 40) {
      const chunk = templateIds.slice(i, i + 40);
      const found = await getAll("/products", wooProductSchema, {
        query: { sku: chunk.map(designSku).join(","), status: "publish" },
        ...CATALOG_CACHE,
      });
      for (const id of chunk)
        for (const p of found) {
          const info = toDesignInfo(p, id);
          if (info) out.push(info);
        }
    }
    return out;
  }

  async function publishDesignProduct(
    wooProductId: number,
    opts: { imageUrls?: string[] },
  ): Promise<void> {
    const publish = (withImage: boolean) =>
      request("PUT", `/products/${wooProductId}`, {
        body: {
          status: "publish",
          ...(withImage && opts.imageUrls?.length
            ? { images: opts.imageUrls.map((src) => ({ src })) }
            : {}),
        },
      });
    try {
      await publish(true);
    } catch (err) {
      // WooCommerce fetches the image itself; when it can't (unreachable host,
      // local dev), publish without one — the founder adds it in WP admin.
      if (
        opts.imageUrls?.length &&
        err instanceof WooCommerceError &&
        err.status === 400
      )
        await publish(false);
      else throw err;
    }
  }

  async function getProduct(productId: ProductId) {
    const products = await get("/products", z.array(wooProductSchema), {
      query: { sku: productId, status: "publish" },
      ...CATALOG_CACHE,
    });
    const p = products.find((x) => x.sku === productId);
    return p ? withVariations(p) : null;
  }

  // -------------------------------------------------------------------------
  // Shipping (zones cached in memory for 10 min, plus Next's data cache)
  // -------------------------------------------------------------------------

  let zoneCache: { at: number; zones: ZoneWithRates[] } | undefined;

  async function loadZones(): Promise<ZoneWithRates[]> {
    if (zoneCache && now() - zoneCache.at < SHIPPING_TTL_MS)
      return zoneCache.zones;
    const opts = { revalidate: SHIPPING_TTL_MS / 1000 };
    const zones = await get(
      "/shipping/zones",
      z.array(wooShippingZoneSchema),
      opts,
    );
    const withRates = await Promise.all(
      zones.map(async (zone) => ({
        zone,
        methods: await get(
          `/shipping/zones/${zone.id}/methods`,
          z.array(wooZoneMethodSchema),
          opts,
        ),
      })),
    );
    zoneCache = { at: now(), zones: withRates };
    return withRates;
  }

  async function quoteShipping(city: string): Promise<ShippingQuote> {
    const shippingPkr = quoteFromZones(city, await loadZones());
    if (shippingPkr === null)
      throw new WooCommerceError(`No flat-rate shipping for "${city}"`, 422);
    return { city, shippingPkr };
  }

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------

  const knownCheckouts = new Map<string, OrderId>();
  const inFlight = new Map<string, Promise<Order>>();

  async function rawOrder(id: OrderId): Promise<WooOrder | null> {
    try {
      return await get(`/orders/${id}`, wooOrderSchema);
    } catch (e) {
      if (e instanceof WooCommerceError && e.status === 404) return null;
      throw e;
    }
  }

  /**
   * WC's REST API can't filter orders by meta, so we scan orders created in
   * the idempotency window for `_checkout_id`. Checkout retries happen within
   * seconds/minutes, so 48 h is plenty and keeps the scan to a page or two.
   */
  async function findByCheckoutId(
    checkoutId: string,
  ): Promise<WooOrder | null> {
    const known = knownCheckouts.get(checkoutId);
    if (known !== undefined) {
      const o = await rawOrder(known);
      if (o) return o;
    }
    const after = new Date(now() - IDEMPOTENCY_WINDOW_MS)
      .toISOString()
      .slice(0, 19);
    const recent = await getAll("/orders", wooOrderSchema, {
      query: { after, dates_are_gmt: true, orderby: "date", order: "desc" },
    });
    return (
      recent.find(
        (o) => metaValue(o.meta_data, META.checkoutId) === checkoutId,
      ) ?? null
    );
  }

  async function createOrderOnce(input: CreateOrderInput): Promise<Order> {
    for (const l of input.lines)
      if (!Number.isInteger(l.quantity) || l.quantity < 1)
        throw new WooCommerceError(`Invalid quantity ${l.quantity}`, 422);
    if (input.lines.length === 0)
      throw new WooCommerceError("Order has no lines", 422);

    const catalog = await listProducts();
    const existing = await findByCheckoutId(input.checkoutId);
    if (existing) {
      knownCheckouts.set(input.checkoutId, existing.id);
      return mapOrder(existing, catalog);
    }

    const lines: ResolvedLine[] = await Promise.all(
      input.lines.map(async (l) => {
        const product = catalog.find((p) => p.productId === l.productId);
        const variant = product && findVariant(product, l.colourId, l.size);
        if (!product || !variant)
          throw new WooCommerceError(
            `Unknown product/colour/size ${l.productId}/${l.colourId}/${l.size ?? "-"}`,
            422,
          );
        if (!variant.inStock)
          throw new WooCommerceError(
            `${product.name} (${l.colourId}${l.size ? `, ${l.size}` : ""}) is unavailable`,
            409,
          );
        if (l.templateId) {
          // Design product: priced by its own simple WooCommerce product (never
          // the client); the base product only validates colour and size.
          const design = await getDesignProduct(l.templateId);
          if (!design || design.baseProductId !== l.productId)
            throw new WooCommerceError(
              `Design ${l.templateId} is unavailable`,
              409,
            );
          return {
            wooProductId: design.wooProductId,
            wooVariationId: 0,
            quantity: l.quantity,
            designId: l.designId,
            design: {
              templateId: l.templateId,
              productId: l.productId,
              colourId: l.colourId,
              ...(l.size ? { size: l.size } : {}),
            },
          };
        }
        return {
          wooProductId: product.wooProductId,
          wooVariationId: variant.wooVariationId,
          quantity: l.quantity,
          designId: l.designId,
        };
      }),
    );

    const { shippingPkr } = await quoteShipping(
      input.delivery?.city ?? input.customer.city,
    );
    let json: unknown;
    try {
      ({ json } = await request("POST", "/orders", {
        body: buildOrderBody(input, lines, shippingPkr),
      }));
    } catch (err) {
      // WordPress often saves the order and only then crashes (a plugin
      // failing while sending the "new order" email answers 500). Look before
      // telling the customer it failed: the checkoutId finds it.
      if (!(err instanceof WooCommerceError) || err.status < 500) throw err;
      const saved = await findByCheckoutId(input.checkoutId).catch(() => null);
      if (!saved) throw err;
      console.warn(
        `[commerce] WooCommerce answered ${err.status} but saved order ${saved.id}; check the WordPress fatal-errors log`,
      );
      knownCheckouts.set(input.checkoutId, saved.id);
      return mapOrder(saved, catalog);
    }
    const created = wooOrderSchema.parse(json);
    knownCheckouts.set(input.checkoutId, created.id);
    return mapOrder(created, catalog);
  }

  // -------------------------------------------------------------------------
  // Customers (accounts)
  // -------------------------------------------------------------------------

  async function findCustomerByEmail(email: string) {
    const wanted = email.trim().toLowerCase();
    const found = await get("/customers", z.array(wooCustomerSchema), {
      query: { email: wanted, per_page: 5 },
    });
    const c = found.find((x) => x.email.toLowerCase() === wanted);
    return c ? mapCustomer(c) : null;
  }

  return {
    listProducts,
    getProduct,
    findCoupon,
    createDesignProduct,
    getDesignProduct,
    listDesignProducts,
    publishDesignProduct,
    quoteShipping,

    findCustomerByEmail,

    async getCustomer(id) {
      try {
        return mapCustomer(await get(`/customers/${id}`, wooCustomerSchema));
      } catch (e) {
        if (e instanceof WooCommerceError && e.status === 404) return null;
        throw e;
      }
    },

    async createCustomer(input) {
      try {
        const { json } = await request("POST", "/customers", {
          body: {
            email: input.email,
            first_name: input.firstName,
            last_name: input.lastName,
            password: input.password,
          },
        });
        return mapCustomer(wooCustomerSchema.parse(json));
      } catch (e) {
        if (e instanceof WooCommerceError && e.code && EXISTS_CODES.has(e.code))
          return null;
        throw e;
      }
    },

    async verifyCustomerPassword(email, password, clientIp) {
      // JWT Authentication for WP REST API. WordPress accepts the email as the username.
      const res = await doFetch(
        `${config.url.replace(/\/+$/, "")}/wp-json/jwt-auth/v1/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
          },
          body: JSON.stringify({ username: email, password }),
          cache: "no-store",
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      const text = await res.text();
      let code: string | undefined;
      try {
        code = (JSON.parse(text) as { code?: string }).code;
      } catch {
        /* not JSON */
      }
      // 403 = wrong credentials (or a lockout). But the plugin also answers 403
      // when JWT_AUTH_SECRET_KEY is missing in wp-config.php: that is our setup
      // being broken, not the customer's password.
      if (code === "jwt_auth_bad_config")
        throw new WooCommerceError(
          "JWT Authentication plugin is not configured: define JWT_AUTH_SECRET_KEY in wp-config.php",
          res.status,
          code,
        );
      // 404 = plugin not installed (thrown below).
      if (res.status === 401 || res.status === 403) return null;
      if (!res.ok)
        throw new WooCommerceError(
          `WordPress sign-in check failed (${res.status}); is the JWT Authentication plugin installed?`,
          res.status,
        );
      return findCustomerByEmail(email);
    },

    async setCustomerPassword(id, password) {
      await request("PUT", `/customers/${id}`, { body: { password } });
    },

    async updateCustomerProfile(id, profile) {
      await request("PUT", `/customers/${id}`, {
        body: {
          billing: {
            phone: profile.phone,
            address_1: profile.addressLine,
            address_2: profile.landmark ?? "",
            city: profile.city,
            country: "PK",
          },
        },
      });
    },

    async updateCustomerAccount(id, update) {
      await request("PUT", `/customers/${id}`, {
        body: {
          first_name: update.firstName,
          last_name: update.lastName,
          // WC replaces an existing key when meta is sent without an id.
          meta_data: [
            {
              key: META.marketingOptIn,
              value: update.marketingOptIn ? "yes" : "no",
            },
          ],
        },
      });
    },

    async deleteCustomer(id) {
      try {
        // force: customers can't be trashed. reassign=0: WordPress keeps no
        // posts for them (orders stay in WooCommerce either way).
        await request("DELETE", `/customers/${id}`, {
          query: { force: true, reassign: 0 },
        });
      } catch (e) {
        if (e instanceof WooCommerceError && e.status === 404) return;
        throw e;
      }
    },

    async listCustomerOrders(customerId, page = 1): Promise<CustomerOrderPage> {
      if (!Number.isInteger(customerId) || customerId <= 0)
        throw new WooCommerceError(`Invalid customer ${customerId}`, 400);
      if (!Number.isInteger(page) || page < 1)
        throw new WooCommerceError(`Invalid page ${page}`, 400);
      const { json, headers } = await request("GET", "/orders", {
        query: {
          customer: customerId,
          page,
          per_page: CUSTOMER_ORDERS_PAGE,
          orderby: "date",
          order: "desc",
        },
      });
      const raw = z.array(wooOrderSchema).parse(json);
      const catalog = await listProducts();
      return {
        // Belt and braces: never show another customer's order.
        orders: raw
          .filter((o) => o.customer_id === customerId)
          .map((o) => mapOrder(o, catalog)),
        totalPages: Math.max(1, Number(headers.get("x-wp-totalpages")) || 1),
      };
    },

    async getCustomerOrder(customerId, id) {
      const o = await rawOrder(id);
      if (!o || customerId <= 0 || o.customer_id !== customerId) return null;
      return mapOrder(o, await listProducts());
    },

    async listSavedDesigns(customerId) {
      const c = await get(`/customers/${customerId}`, wooCustomerSchema);
      return parseSavedDesigns(
        c.meta_data.find((m) => m.key === META.savedDesigns)?.value,
      );
    },

    async setSavedDesigns(customerId, designs) {
      assertSavedDesignList(designs);
      await request("PUT", `/customers/${customerId}`, {
        body: {
          meta_data: [
            { key: META.savedDesigns, value: JSON.stringify(designs) },
          ],
        },
      });
    },

    createOrder(input) {
      // Same checkoutId submitted twice at once (double tap) → one WC order.
      const pending = inFlight.get(input.checkoutId);
      if (pending) return pending;
      const p = createOrderOnce(input).finally(() =>
        inFlight.delete(input.checkoutId),
      );
      inFlight.set(input.checkoutId, p);
      return p;
    },

    async getOrder(id) {
      const o = await rawOrder(id);
      return o ? mapOrder(o, await listProducts()) : null;
    },

    async findOrderForTracking(id, phone) {
      const o = await rawOrder(id);
      if (!o) return null;
      const order = mapOrder(o, await listProducts());
      return order.customer.phone === phone ? order : null;
    },

    async setOrderStatus(id, status) {
      await request("PUT", `/orders/${id}`, { body: { status } });
    },

    async setLineFiles(id, lineIndex, files) {
      const o = await rawOrder(id);
      if (!o) throw new WooCommerceError(`Order ${id} not found`, 404);
      const item = o.line_items[lineIndex];
      if (!item)
        throw new WooCommerceError(`Order ${id} has no line ${lineIndex}`, 404);
      const meta_data = [
        ...(files.printPngUrl
          ? [{ key: META.printPngUrl, value: files.printPngUrl }]
          : []),
        ...(files.proofPdfUrl
          ? [{ key: META.proofPdfUrl, value: files.proofPdfUrl }]
          : []),
      ];
      if (meta_data.length === 0) return;
      // WC replaces an existing key when meta is sent without an id.
      await request("PUT", `/orders/${id}`, {
        body: { line_items: [{ id: item.id, meta_data }] },
      });
    },

    async addOrderNote(id, note) {
      await request("POST", `/orders/${id}/notes`, {
        body: { note, customer_note: false },
      });
    },

    async listOrdersForRetention(page) {
      if (!Number.isInteger(page) || page < 1)
        throw new WooCommerceError(`Invalid page ${page}`, 400);
      // No status filter = WC's default "any" (every status except trash).
      // Oldest ID first: new orders are appended at the end, so the pages
      // already read don't shift while the scan runs.
      const { json, headers } = await request("GET", "/orders", {
        query: {
          page,
          per_page: PAGE_SIZE,
          orderby: "id",
          order: "asc",
          _fields:
            "id,status,customer_id,date_modified_gmt,date_completed_gmt,meta_data,line_items",
        },
      });
      const orders = z.array(wooRetentionOrderSchema).parse(json);
      const rawTotal = headers.get("x-wp-total");
      const rawPages = headers.get("x-wp-totalpages");
      const total = Number(rawTotal);
      const totalPages = Number(rawPages);
      // The job needs these to know it saw every order; never guess.
      if (
        rawTotal === null ||
        rawPages === null ||
        !Number.isInteger(total) ||
        !Number.isInteger(totalPages)
      )
        throw new WooCommerceError(
          "WooCommerce GET /orders sent no X-WP-Total headers",
          502,
        );
      return { orders: orders.map(mapRetentionOrder), total, totalPages };
    },

    async markRetentionDone(id, doneAt) {
      await request("PUT", `/orders/${id}`, {
        body: { meta_data: [{ key: META.retentionDone, value: doneAt }] },
      });
    },

    async verifyWebhook(rawBody, headers) {
      return verifyWooWebhook(rawBody, headers, config.webhookSecret);
    },
  };
}
