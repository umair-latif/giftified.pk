import {
  getProduct as getProductConfig,
  type ProductId,
} from "@/config/products";
import type {
  CreateOrderInput,
  CustomerDetails,
  Order,
  OrderStatus,
  PkMobile,
} from "@/types/order";
import type { Coupon } from "@/lib/coupons";
import type { CatalogProduct, CatalogVariant, RetentionOrder } from "./types";
import type {
  WooAttributeTerm,
  WooCoupon,
  WooMeta,
  WooOrder,
  WooProduct,
  WooRetentionOrder,
  WooShippingZone,
  WooVariation,
  WooZoneMethod,
} from "./woo-schemas";

/**
 * Pure mapping between WooCommerce REST shapes and our domain types.
 * No network, no env — everything here is unit-tested with recorded fixtures.
 */

/** WC product SKU ↔ our ProductId. The SKU on the parent product is the link. */
export const PRODUCT_SKUS: readonly ProductId[] = ["mug", "tshirt", "hoodie"];

export const META = {
  checkoutId: "_checkout_id",
  courier: "_courier",
  trackingNumber: "_tracking_number",
  trackingUrl: "_tracking_url",
  designId: "_design_id",
  printPngUrl: "_print_png_url",
  proofPdfUrl: "_proof_pdf_url",
  contentConfirmed: "_content_confirmed",
  /** Order meta: ticked at checkout (task 13). The account's default is CUSTOMER_META. */
  marketingOptIn: "_marketing_optin",
  retainForReview: "_retain_for_review",
  retentionDone: "_retention_done",
  templateId: "_template_id",
  baseProduct: "_base_product",
} as const;

/**
 * Customer (user) meta. Unlike order meta these must NOT start with "_":
 * WooCommerce's customers REST API silently drops "protected" (underscore)
 * meta keys on write and hides them on read, so a "_" key is never stored.
 * Also avoid a "wp_" prefix or the site's table prefix (filtered out too).
 */
export const CUSTOMER_META = {
  /** "yes"/"no": the account's marketing preference (task 21). */
  marketingOptIn: "giftified_marketing_optin",
  /** JSON list of saved designs (task 22). */
  savedDesigns: "giftified_saved_designs",
} as const;

/** Visible line notes on design-product order lines (read back by `mapOrder`). */
export const LINE_NOTE = { colour: "Colour", size: "Size" } as const;

export function isProductId(sku: string): sku is ProductId {
  return (PRODUCT_SKUS as readonly string[]).includes(sku);
}

/** "1499.00" → 1499. PKR is stored as whole rupees. */
export function parsePkr(value: string | number): number | null {
  const n = typeof value === "number" ? value : Number(value.trim());
  if (value === "" || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const COLOUR_ATTR = /^(pa_)?colou?r$/i;
export const isColourAttribute = (name: string) => COLOUR_ATTR.test(name);
const SIZE_ATTR = /^(pa_)?size$/i;

/**
 * WC colour option ("White", "Gloss White") → our colourId ("white").
 * Matches the product config's base colours by id or name, else slugifies.
 */
export function colourIdFor(productId: ProductId, option: string): string {
  const s = slugify(option);
  const colours = getProductConfig(productId)?.baseColors ?? [];
  const hit = colours.find((c) => c.id === s || slugify(c.name) === s);
  return hit?.id ?? s;
}

function defaultColourId(productId: ProductId): string {
  return getProductConfig(productId)?.baseColors[0]?.id ?? "default";
}

export type Hex = `#${string}`;

/**
 * Swatch hex from a colour term's description ("#FFFFFF", "fff", or the
 * same wrapped in <p> by the WP editor). Null when it isn't a hex colour.
 */
export function parseHex(raw: string): Hex | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(htmlToText(raw));
  if (!m) return null;
  const h = m[1]!.toLowerCase();
  return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`;
}

/** Colour hexes keyed by lower-cased term name (the option shown on variations). */
export type ColourHexes = ReadonlyMap<string, Hex>;

export function colourHexesFromTerms(terms: WooAttributeTerm[]): ColourHexes {
  const out = new Map<string, Hex>();
  for (const t of terms) {
    const hex = parseHex(t.description);
    if (hex) out.set(t.name.trim().toLowerCase(), hex);
  }
  return out;
}

/**
 * Display name + swatch for a variant: WooCommerce first (term name, hex from
 * the global Colour attribute), then the product config's `baseColors`.
 */
function colourDisplay(
  productId: ProductId,
  colourId: string,
  wcName: string | undefined,
  hexes: ColourHexes | undefined,
): Pick<CatalogVariant, "colourName" | "colourHex"> {
  const cfg = getProductConfig(productId)?.baseColors.find(
    (c) => c.id === colourId,
  );
  const colourName = wcName?.trim() || cfg?.name;
  const colourHex =
    (wcName && hexes?.get(wcName.trim().toLowerCase())) || cfg?.hex;
  return {
    ...(colourName ? { colourName } : {}),
    ...(colourHex ? { colourHex } : {}),
  };
}

/** The regular price, only when it is higher than the current (sale) price. */
export function regularIfReduced(
  regular: string | undefined,
  pricePkr: number,
): { regularPricePkr: number } | Record<string, never> {
  const r = regular ? parsePkr(regular) : null;
  return r !== null && r > pricePkr ? { regularPricePkr: r } : {};
}

export function mapVariation(
  productId: ProductId,
  v: WooVariation,
  hexes?: ColourHexes,
): CatalogVariant | null {
  const pricePkr = parsePkr(v.price);
  if (pricePkr === null || v.status !== "publish") return null;
  const colour = v.attributes.find((a) => COLOUR_ATTR.test(a.name));
  const size = v.attributes.find((a) => SIZE_ATTR.test(a.name));
  const colourId = colour
    ? colourIdFor(productId, colour.option)
    : defaultColourId(productId);
  return {
    colourId,
    ...colourDisplay(productId, colourId, colour?.option, hexes),
    ...(size ? { size: size.option } : {}),
    wooVariationId: v.id,
    pricePkr,
    ...regularIfReduced(v.regular_price, pricePkr),
    inStock: v.stock_status === "instock",
  };
}

/**
 * WC product (+ its variations) → CatalogProduct. Simple products become a
 * single variant with `wooVariationId: 0`. Returns null for products whose SKU
 * isn't one of ours or that have no sellable price.
 */
export function mapProduct(
  p: WooProduct,
  variations: WooVariation[],
  hexes?: ColourHexes,
): CatalogProduct | null {
  if (!isProductId(p.sku) || p.status !== "publish") return null;
  const productId = p.sku;
  let variants: CatalogVariant[];
  if (p.type === "variable") {
    variants = variations
      .map((v) => mapVariation(productId, v, hexes))
      .filter((v): v is CatalogVariant => v !== null);
  } else {
    const pricePkr = parsePkr(p.price);
    variants =
      pricePkr === null
        ? []
        : [
            {
              colourId: defaultColourId(productId),
              ...colourDisplay(
                productId,
                defaultColourId(productId),
                undefined,
                hexes,
              ),
              wooVariationId: 0,
              pricePkr,
              ...regularIfReduced(p.regular_price, pricePkr),
              inStock: p.stock_status === "instock",
            },
          ];
  }
  if (variants.length === 0) return null;
  return {
    productId,
    wooProductId: p.id,
    slug: p.slug || productId,
    name: p.name,
    images: p.images.map((i) => ({ src: i.src, alt: i.alt || p.name })),
    ...describe(p),
    basePricePkr: Math.min(...variants.map((v) => v.pricePkr)),
    ...(p.categories?.length
      ? { categoryIds: p.categories.map((c) => c.id) }
      : {}),
    variants,
  };
}

export function findVariant(
  product: CatalogProduct,
  colourId: string,
  size?: string,
): CatalogVariant | undefined {
  return product.variants.find(
    (v) =>
      v.colourId === colourId &&
      (size === undefined || v.size?.toLowerCase() === size.toLowerCase()),
  );
}

/**
 * WC has more statuses than our lifecycle. Anything that is not live becomes
 * "cancelled"; "pending" (unpaid, e.g. created in admin) is treated as on-hold.
 */
export function mapStatus(wcStatus: string): OrderStatus | null {
  switch (wcStatus) {
    case "on-hold":
    case "pending":
      return "on-hold";
    case "processing":
      return "processing";
    case "completed":
      return "completed";
    case "cancelled":
    case "failed":
    case "refunded":
    case "trash":
      return "cancelled";
    default:
      return null;
  }
}

/**
 * Best-effort E.164 for phones read back from WC. Our checkout writes E.164
 * already; this only tidies numbers typed into WP admin by hand.
 */
export function toPkMobile(raw: string): PkMobile | null {
  const d = raw.replace(/\D/g, "");
  const national = d.startsWith("0092")
    ? d.slice(4)
    : d.startsWith("92")
      ? d.slice(2)
      : d.startsWith("0")
        ? d.slice(1)
        : d;
  return /^3\d{9}$/.test(national) ? `+92${national}` : null;
}

export function metaValue(meta: WooMeta[], key: string): string | undefined {
  const v = meta.find((m) => m.key === key)?.value;
  return typeof v === "string" && v !== "" ? v : undefined;
}

/**
 * A field the founder fills in by hand in WP admin → order → Custom fields.
 * WordPress hides and refuses names starting with "_" in that box, so the
 * plain name ("courier") is accepted as well as the underscore one ("_courier",
 * which the REST API can still write). The underscore one wins if both exist.
 */
export function founderMetaRaw(meta: WooMeta[], key: string): unknown {
  const plain = key.replace(/^_/, "");
  return (
    meta.find((m) => m.key === key)?.value ??
    meta.find((m) => m.key === plain)?.value
  );
}

export function founderMeta(meta: WooMeta[], key: string): string | undefined {
  const v = founderMetaRaw(meta, key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function splitNameKeys(fullName: string) {
  const { first, last } = splitName(fullName);
  return { first_name: first, last_name: last };
}

/** IPv4 or IPv6 literal (no ports, no names) — never pass header junk to WooCommerce. */
export function isIp(v: string): boolean {
  return (
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(v) ||
    (/^[0-9a-f:]+$/i.test(v) && v.includes(":") && v.length <= 45)
  );
}

export interface ResolvedLine {
  wooProductId: number;
  wooVariationId: number;
  quantity: number;
  designId: string;
  /**
   * Design product line (task 26): a SIMPLE product with no variation, so the
   * chosen base product / colour / size are written as line notes instead.
   */
  design?: {
    templateId: string;
    productId: string;
    colourId: string;
    size?: string;
  };
}

/**
 * Body for `POST /orders`. No prices are sent for line items: WooCommerce
 * prices them itself from the product/variation, so client prices can never
 * reach the order. Shipping comes from our own zone lookup.
 */
export function buildOrderBody(
  input: CreateOrderInput,
  lines: ResolvedLine[],
  shippingPkr: number,
) {
  const { first, last } = splitName(input.customer.fullName);
  const address = {
    ...(input.email ? { email: input.email } : {}),
    first_name: first,
    last_name: last,
    address_1: input.customer.addressLine,
    address_2: input.customer.landmark ?? "",
    city: input.customer.city,
    country: "PK",
    phone: input.customer.phone,
  };
  // A different delivery address only changes WooCommerce's shipping block;
  // billing stays the customer's own. Phone/email stay so the courier can call.
  const shipping = input.delivery
    ? {
        ...address,
        ...splitNameKeys(input.delivery.fullName ?? input.customer.fullName),
        address_1: input.delivery.addressLine,
        address_2: input.delivery.landmark ?? "",
        city: input.delivery.city,
      }
    : address;
  return {
    payment_method: "cod",
    payment_method_title: "Cash on Delivery",
    set_paid: false,
    status: "on-hold",
    billing: address,
    shipping,
    line_items: lines.map((l) => ({
      product_id: l.wooProductId,
      ...(l.wooVariationId ? { variation_id: l.wooVariationId } : {}),
      quantity: l.quantity,
      meta_data: [
        { key: META.designId, value: l.designId },
        ...(l.design
          ? [
              { key: META.templateId, value: l.design.templateId },
              { key: META.baseProduct, value: l.design.productId },
              // No leading underscore: WP admin shows these on the order line.
              { key: LINE_NOTE.colour, value: l.design.colourId },
              ...(l.design.size
                ? [{ key: LINE_NOTE.size, value: l.design.size }]
                : []),
            ]
          : []),
      ],
    })),
    ...(input.couponCode ? { coupon_lines: [{ code: input.couponCode }] } : {}),
    ...(input.customerId ? { customer_id: input.customerId } : {}),
    ...(input.customerIp && isIp(input.customerIp)
      ? { customer_ip_address: input.customerIp }
      : {}),
    shipping_lines: [
      {
        method_id: "flat_rate",
        method_title: "Flat rate",
        total: String(shippingPkr),
      },
    ],
    meta_data: [
      { key: META.checkoutId, value: input.checkoutId },
      ...(input.consents
        ? [
            {
              key: META.contentConfirmed,
              value: input.consents.contentConfirmedAt,
            },
          ]
        : []),
      ...(input.consents?.marketingOptIn
        ? [{ key: META.marketingOptIn, value: "yes" }]
        : []),
    ],
  };
}

/** WC order → our Order. `catalog` resolves WC product/variation IDs. */
export function mapOrder(o: WooOrder, catalog: CatalogProduct[]): Order {
  const status = mapStatus(o.status);
  if (!status) throw new Error(`Order ${o.id}: unknown status "${o.status}"`);

  const addr = o.shipping.address_1 ? o.shipping : o.billing;
  const rawPhone = o.billing.phone || o.shipping.phone;
  // Orders typed into WP admin by hand may carry a landline or a typo. Don't
  // fail the whole order (the print-file job must still run): keep the digits
  // as a best-effort +92 number. Our checkout always writes a valid mobile.
  const phone: PkMobile =
    toPkMobile(rawPhone) ??
    `+92${rawPhone.replace(/\D/g, "").replace(/^(0092|92|0)/, "")}`;
  const landmark = addr.address_2.trim();
  const customer: CustomerDetails = {
    fullName: `${addr.first_name} ${addr.last_name}`.trim(),
    phone,
    city: addr.city,
    addressLine: addr.address_1,
    ...(landmark ? { landmark } : {}),
  };

  const lines = o.line_items.map((li) => {
    const templateId = metaValue(li.meta_data, META.templateId);
    const noteProduct = metaValue(li.meta_data, META.baseProduct);
    const product = catalog.find((p) => p.wooProductId === li.product_id);
    // Design-product lines (task 26) are not in the base catalog: their base
    // product, colour and size come from the line notes we wrote at checkout.
    const design =
      !product && templateId && noteProduct && isProductId(noteProduct)
        ? {
            productId: noteProduct,
            colourId: metaValue(li.meta_data, LINE_NOTE.colour) ?? "",
            size: metaValue(li.meta_data, LINE_NOTE.size),
          }
        : null;
    if (!product && !design)
      throw new Error(`Order ${o.id}: unknown product ${li.product_id}`);
    const variant =
      product &&
      (li.variation_id
        ? product.variants.find((v) => v.wooVariationId === li.variation_id)
        : product.variants[0]);
    if (product && !variant)
      throw new Error(`Order ${o.id}: unknown variation ${li.variation_id}`);
    const unit =
      li.price !== undefined
        ? parsePkr(li.price)
        : parsePkr(String(Number(li.subtotal) / li.quantity));
    const printPngUrl = metaValue(li.meta_data, META.printPngUrl);
    const proofPdfUrl = metaValue(li.meta_data, META.proofPdfUrl);
    const size = variant?.size ?? design?.size;
    return {
      productId: (product?.productId ?? design!.productId) as ProductId,
      colourId: variant?.colourId ?? design!.colourId,
      ...(size ? { size } : {}),
      ...(templateId ? { templateId } : {}),
      quantity: li.quantity,
      designId: metaValue(li.meta_data, META.designId) ?? "",
      unitPricePkr: unit ?? 0,
      ...(printPngUrl ? { printPngUrl } : {}),
      ...(proofPdfUrl ? { proofPdfUrl } : {}),
    };
  });

  const courier = founderMeta(o.meta_data, META.courier);
  const trackingNumber = founderMeta(o.meta_data, META.trackingNumber);
  const trackingUrl = founderMeta(o.meta_data, META.trackingUrl);
  const email = o.billing.email?.trim().toLowerCase();

  const created = o.date_created_gmt;
  return {
    id: o.id,
    status,
    createdAt: created
      ? new Date(
          /[zZ]|[+-]\d\d:?\d\d$/.test(created) ? created : `${created}Z`,
        ).toISOString()
      : new Date(0).toISOString(),
    customer,
    ...(email ? { email } : {}),
    ...(courier && trackingNumber
      ? {
          tracking: {
            courier,
            number: trackingNumber,
            ...(trackingUrl && /^https:\/\//.test(trackingUrl)
              ? { url: trackingUrl }
              : {}),
          },
        }
      : {}),
    lines,
    shippingPkr: parsePkr(o.shipping_total) ?? 0,
    ...((parsePkr(o.discount_total ?? "") ?? 0) > 0
      ? { discountPkr: parsePkr(o.discount_total ?? "") ?? 0 }
      : {}),
    totalPkr: parsePkr(o.total) ?? 0,
    paymentMethod: "cod",
  };
}

// ---------------------------------------------------------------------------
// Shipping
// ---------------------------------------------------------------------------

export interface ZoneWithRates {
  zone: WooShippingZone;
  methods: WooZoneMethod[];
}

/** First enabled flat_rate cost in a zone, as whole rupees. */
export function flatRateCost(methods: WooZoneMethod[]): number | null {
  const m = [...methods]
    .filter((x) => x.enabled && x.method_id === "flat_rate")
    .sort((a, b) => a.order - b.order)[0];
  const raw = m?.settings.cost?.value;
  return raw === undefined ? null : parsePkr(raw);
}

function normCity(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * WooCommerce zones can't target a city directly (only country/state/postcode),
 * so the convention is: **the zone name lists its cities**, separated by commas
 * ("Lahore" or "Gujrat, Sialkot, Jhelum"). A city not named in any zone uses
 * the zone called "Rest of Pakistan" / "Other cities" (any name containing
 * "rest of" or "other"), then WC's built-in "Locations not covered" zone (id 0).
 */
export function quoteFromZones(
  city: string,
  zones: ZoneWithRates[],
): number | null {
  const want = normCity(city);
  const ordered = [...zones].sort((a, b) => a.zone.order - b.zone.order);
  const named = ordered.find(
    (z) =>
      z.zone.id !== 0 &&
      z.zone.name.split(/[,/|]/).map(normCity).includes(want),
  );
  const rest = ordered.find(
    (z) => z.zone.id !== 0 && /\b(rest of|other)\b/i.test(z.zone.name),
  );
  const notCovered = ordered.find((z) => z.zone.id === 0);
  for (const z of [named, rest, notCovered]) {
    const cost = z ? flatRateCost(z.methods) : null;
    if (cost !== null) return cost;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Product descriptions
// ---------------------------------------------------------------------------

const SHORT_MAX = 180;

function describe(
  p: WooProduct,
): Pick<CatalogProduct, "shortDescription" | "descriptionHtml"> {
  let short =
    htmlToText(p.short_description ?? "") || htmlToText(p.description ?? "");
  if (short.length > SHORT_MAX) {
    const cut = short.lastIndexOf(" ", SHORT_MAX - 1);
    short = `${short.slice(0, cut > 80 ? cut : SHORT_MAX - 1)}…`;
  }
  const html = sanitizeHtml(p.description ?? "");
  return {
    ...(short ? { shortDescription: short } : {}),
    ...(html ? { descriptionHtml: html } : {}),
  };
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/** WP editor HTML → one line of plain text (tags dropped, entities decoded). */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(DROP_WITH_CONTENT, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const cp =
          e[1] === "x" || e[1] === "X"
            ? parseInt(e.slice(2), 16)
            : parseInt(e.slice(1), 10);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff
          ? String.fromCodePoint(cp)
          : " ";
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Tags we keep (without any attributes). Everything else is dropped. */
const ALLOWED_TAGS = new Set(["p", "ul", "li", "strong", "em", "br"]);
const RENAMED_TAGS: Record<string, string> = {
  b: "strong",
  i: "em",
  ol: "ul",
  h1: "p",
  h2: "p",
  h3: "p",
  h4: "p",
  h5: "p",
  h6: "p",
};
/** Dropped without a space, so "Gujrat</a>." stays "Gujrat." */
const INLINE_TAGS = new Set([
  "a",
  "span",
  "font",
  "u",
  "s",
  "small",
  "big",
  "sub",
  "sup",
  "abbr",
  "code",
  "mark",
  "img",
]);
/** Elements whose CONTENT must go too, not just the tags. */
const DROP_WITH_CONTENT =
  /<(script|style|iframe|object|embed|noscript|template|svg|math|textarea|select|title|head)\b[\s\S]*?<\/\1\s*>/gi;

/**
 * Allow-list sanitiser for product descriptions: only p, ul, li, strong, em
 * and br survive, always WITHOUT attributes (so no links, styles or event
 * handlers). Every `<` in the output comes from a tag we emitted ourselves;
 * any other `<` or `>` is escaped. Text and entities pass through unchanged.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DROP_WITH_CONTENT, " ")
    .replace(
      /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>|[<>]/g,
      (m, slash: string | undefined, name: string | undefined) => {
        if (!name) return m === "<" ? "&lt;" : "&gt;";
        const lower = name.toLowerCase();
        const tag = RENAMED_TAGS[lower] ?? lower;
        if (!ALLOWED_TAGS.has(tag)) return INLINE_TAGS.has(tag) ? "" : " ";
        if (tag === "br") return slash ? "" : "<br>";
        return `<${slash ? "/" : ""}${tag}>`;
      },
    )
    .replace(/\s+/g, " ")
    .replace(/<(p|li|ul|strong|em)>\s*<\/\1>/g, "")
    .replace(/\s*(<\/?(?:p|ul|li)>|<br>)\s*/g, "$1")
    .trim();
}

/** WC "…_gmt" date ("2026-09-27T12:04:11", no zone) → ISO 8601 UTC; null if absent/invalid. */
export function wooGmtToIso(d: string | null | undefined): string | null {
  if (!d) return null;
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(d) ? d : `${d}Z`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/**
 * `_retain_for_review`: the founder types "yes". Anything yes-like counts —
 * when in doubt the files are kept.
 */
export function isRetainFlag(v: unknown): boolean {
  if (v === true || v === 1) return true;
  return (
    typeof v === "string" &&
    ["yes", "y", "true", "1"].includes(v.trim().toLowerCase())
  );
}

/** Slim WC order → what the retention job needs (task 24). */
export function mapRetentionOrder(o: WooRetentionOrder): RetentionOrder {
  const modified = wooGmtToIso(o.date_modified_gmt);
  const closedAt =
    o.status === "completed"
      ? (wooGmtToIso(o.date_completed_gmt) ?? modified)
      : o.status === "cancelled"
        ? modified
        : null;
  const designIds = [
    ...new Set(
      o.line_items
        .map((li) => metaValue(li.meta_data, META.designId)?.trim())
        .filter((id): id is string => !!id),
    ),
  ];
  return {
    id: o.id,
    status: o.status,
    closedAt,
    customerId: o.customer_id,
    designIds,
    retainForReview: isRetainFlag(
      founderMetaRaw(o.meta_data, META.retainForReview),
    ),
    retentionDoneAt: metaValue(o.meta_data, META.retentionDone) ?? null,
  };
}

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Designer's plain text → WooCommerce description HTML (paragraphs on blank lines). */
export function descriptionHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** A WooCommerce coupon → our pure `Coupon` (see `src/lib/coupons.ts` for what is supported). */
export function mapCoupon(c: WooCoupon): Coupon | null {
  const kind =
    c.discount_type === "percent"
      ? "percent"
      : c.discount_type === "fixed_cart"
        ? "fixed_cart"
        : c.discount_type === "fixed_product"
          ? "fixed_product"
          : null;
  const amount = Number(c.amount);
  if (!kind || !Number.isFinite(amount) || amount < 0) return null;
  const min = parsePkr(c.minimum_amount);
  const max = parsePkr(c.maximum_amount);
  return {
    code: c.code.trim().toLowerCase(),
    kind,
    amount,
    freeShipping: c.free_shipping,
    ...(c.date_expires_gmt
      ? {
          expiresAt: new Date(
            /[zZ]|[+-]\d\d:?\d\d$/.test(c.date_expires_gmt)
              ? c.date_expires_gmt
              : `${c.date_expires_gmt}Z`,
          ).toISOString(),
        }
      : {}),
    ...(c.usage_limit ? { usageLimit: c.usage_limit } : {}),
    usageCount: c.usage_count,
    ...(min !== null && min > 0 ? { minSubtotalPkr: min } : {}),
    ...(max !== null && max > 0 ? { maxSubtotalPkr: max } : {}),
    productIds: c.product_ids,
    excludedProductIds: c.excluded_product_ids,
    categoryIds: c.product_categories,
    excludedCategoryIds: c.excluded_product_categories,
    emailRestricted: c.email_restrictions.length > 0,
    published: c.status === "publish",
  };
}
