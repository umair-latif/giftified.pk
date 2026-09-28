import "server-only";
import { z } from "zod";
import type { ProductId } from "@/config/products";
import type { CreateOrderInput, Order, OrderId } from "@/types/order";
import type { CatalogProduct, CommerceClient, ShippingQuote } from "./types";
import {
  META,
  PRODUCT_SKUS,
  buildOrderBody,
  colourHexesFromTerms,
  isColourAttribute,
  findVariant,
  mapOrder,
  mapProduct,
  metaValue,
  quoteFromZones,
  type ResolvedLine,
  type ZoneWithRates,
} from "./woo-map";
import {
  wooAttributeTermSchema,
  wooOrderSchema,
  wooProductSchema,
  wooShippingZoneSchema,
  wooVariationSchema,
  wooZoneMethodSchema,
  type WooOrder,
  type WooProduct,
  type WooVariation,
} from "./woo-schemas";
import { verifyWooWebhook } from "./woo-webhook";

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

export function createWooCommerceClient(config: WooConfig): CommerceClient {
  const doFetch = config.fetch ?? fetch;
  const now = config.now ?? Date.now;
  const base = `${config.url.replace(/\/+$/, "")}/wp-json/wc/v3`;
  const auth = `Basic ${Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`,
  ).toString("base64")}`;

  async function request(
    method: "GET" | "POST" | "PUT",
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

    const lines: ResolvedLine[] = input.lines.map((l) => {
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
      return {
        wooProductId: product.wooProductId,
        wooVariationId: variant.wooVariationId,
        quantity: l.quantity,
        designId: l.designId,
      };
    });

    const { shippingPkr } = await quoteShipping(input.customer.city);
    const { json } = await request("POST", "/orders", {
      body: buildOrderBody(input, lines, shippingPkr),
    });
    const created = wooOrderSchema.parse(json);
    knownCheckouts.set(input.checkoutId, created.id);
    return mapOrder(created, catalog);
  }

  return {
    listProducts,
    getProduct,
    quoteShipping,

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

    async verifyWebhook(rawBody, headers) {
      return verifyWooWebhook(rawBody, headers, config.webhookSecret);
    },
  };
}
