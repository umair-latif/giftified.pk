import type { ProductId } from "@/config/products";
import {
  evaluateCoupon,
  normalizeCouponCode,
  type Coupon,
} from "@/lib/coupons";
import { descriptionHtml } from "./woo-map";
import type {
  CreateOrderInput,
  Order,
  OrderId,
  OrderStatus,
} from "@/types/order";
import type {
  CatalogProduct,
  CommerceClient,
  Customer,
  RetentionOrder,
  VerifiedWebhook,
  WebhookVerification,
  DesignProduct,
  NewDesignProduct,
  SavedDesign,
} from "./types";
import { assertSavedDesignList, parseSavedDesigns } from "./saved-designs";

/**
 * In-memory store for local development and tests. Deterministic prices so
 * UI and tests can assert on them. Replace via `getCommerce()` once
 * WooCommerce credentials are configured.
 */
const CATALOG: CatalogProduct[] = [
  {
    productId: "mug",
    wooProductId: 101,
    slug: "mug",
    images: [],
    name: "Custom Mug",
    shortDescription:
      "11oz gloss white ceramic mug, printed all the way round with your photos and words.",
    descriptionHtml:
      "<p>Classic 11oz ceramic mug with a glossy finish.</p><ul><li>Full-wrap print, 228 × 89 mm</li><li>Dishwasher and microwave safe</li><li>Printed in Gujrat and checked before it ships</li></ul>",
    basePricePkr: 1499,
    variants: [
      {
        colourId: "white",
        colourName: "Gloss White",
        colourHex: "#ffffff",
        wooVariationId: 1011,
        pricePkr: 1499,
        inStock: true,
      },
    ],
  },
  {
    productId: "tshirt",
    wooProductId: 102,
    slug: "tshirt",
    images: [],
    name: "Custom T-Shirt",
    shortDescription:
      "Soft combed-cotton tee with your design printed on the front.",
    descriptionHtml:
      "<p>Combed-cotton tee, front print.</p><ul><li>White or black</li><li>Sizes S to XXL</li></ul>",
    basePricePkr: 1999,
    variants: [
      ["white", "White", "#ffffff"],
      ["black", "Black", "#171717"],
    ].flatMap(([colourId, colourName, colourHex], c) =>
      ["S", "M", "L", "XL", "XXL"].map((size, i) => ({
        colourId: colourId!,
        colourName: colourName!,
        colourHex: colourHex as `#${string}`,
        size,
        wooVariationId: 1021 + c * 10 + i,
        pricePkr: 1999,
        // One sold-out size, so the picker's disabled state is testable.
        inStock: !(colourId === "black" && size === "XXL"),
      })),
    ),
  },
  {
    productId: "hoodie",
    wooProductId: 103,
    slug: "hoodie",
    images: [],
    name: "Custom Hoodie",
    shortDescription:
      "Heavy fleece hoodie with your design printed on the chest.",
    descriptionHtml:
      "<p>Heavy fleece hoodie, front chest print above the pocket.</p><ul><li>Heather grey</li><li>Sizes S to XXL</li></ul>",
    basePricePkr: 3499,
    variants: ["S", "M", "L", "XL", "XXL"].map((size, i) => ({
      colourId: "grey",
      colourName: "Heather Grey",
      colourHex: "#b4b7bc" as const,
      size,
      wooVariationId: 1031 + i,
      pricePkr: 3499,
      inStock: true,
    })),
  },
];

const SHIPPING_PKR: Record<string, number> = {
  Lahore: 200,
  Karachi: 250,
  Islamabad: 250,
  Gujrat: 150,
};
const DEFAULT_SHIPPING_PKR = 300;

/** Test helpers on top of the contract (not part of CommerceClient). */
export interface MockCommerce extends CommerceClient {
  /** Test/demo helper: the way the founder creates a coupon in WP admin. */
  addCoupon(coupon: Partial<Coupon> & Pick<Coupon, "code">): void;
  categoryIdFor(name: string): number;
  /** Sets order meta, e.g. `_retain_for_review` the way the founder does in WP admin. */
  setOrderMeta(id: OrderId, key: string, value: string): void;
}

/** What WooCommerce keeps beside the Order shape (retention job fields). */
interface OrderExtras {
  customerId: number;
  closedAt: string | null;
  meta: Map<string, string>;
}

export function createMockCommerce(
  opts: { now?: () => number } = {},
): MockCommerce {
  const now = opts.now ?? Date.now;
  const orders = new Map<OrderId, Order>();
  const extras = new Map<OrderId, OrderExtras>();
  const byCheckout = new Map<string, OrderId>();
  let nextId = 1000;
  // Accounts: plain-text passwords are fine here — dev/test only.
  const customers = new Map<number, Customer & { password: string }>();
  const savedDesigns = new Map<number, SavedDesign[]>();
  let nextCustomerId = 500;
  let clock = Date.parse("2026-01-01T00:00:00Z");
  const publicCustomer = (c: Customer & { password: string }): Customer => ({
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    modifiedAt: c.modifiedAt,
    ...(c.phone ? { phone: c.phone } : {}),
    ...(c.address ? { address: c.address } : {}),
    ...(c.marketingOptIn ? { marketingOptIn: true } : {}),
  });
  const mustCustomer = (id: number) => {
    const c = customers.get(id);
    if (!c) throw new Error(`Customer ${id} not found`);
    return c;
  };
  const ownOrders = (customerId: number) =>
    [...orders.values()]
      .filter((o) => extras.get(o.id)?.customerId === customerId)
      .sort((a, b) => b.id - a.id);
  const byEmail = (email: string) =>
    [...customers.values()].find((c) => c.email === email.trim().toLowerCase());
  const RETENTION_PAGE = 100;
  const designProducts = new Map<
    string,
    DesignProduct & { status: "draft" | "publish"; input: NewDesignProduct }
  >();
  let nextDesignProductId = 9000;
  const coupons = new Map<string, Coupon>();
  const categoryIds = new Map<string, number>();
  function addDemoCoupons() {
    coupons.set("welcome10", {
      code: "welcome10",
      kind: "percent",
      amount: 10,
      freeShipping: false,
      usageCount: 0,
      productIds: [],
      excludedProductIds: [],
      categoryIds: [],
      excludedCategoryIds: [],
      emailRestricted: false,
      published: true,
    });
  }
  const categoryId = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!categoryIds.has(key)) categoryIds.set(key, 100 + categoryIds.size);
    return categoryIds.get(key)!;
  };

  const find = (productId: ProductId) =>
    CATALOG.find((p) => p.productId === productId) ?? null;
  const must = (id: OrderId) => {
    const o = orders.get(id);
    if (!o) throw new Error(`Order ${id} not found`);
    return o;
  };

  // Demo coupon for local development and the e2e tests: 10 % off everything.
  addDemoCoupons();

  return {
    listProducts: async () => structuredClone(CATALOG),
    getProduct: async (productId) => structuredClone(find(productId)),
    addCoupon(c) {
      const full: Coupon = {
        kind: "percent",
        amount: 10,
        freeShipping: false,
        usageCount: 0,
        productIds: [],
        excludedProductIds: [],
        categoryIds: [],
        excludedCategoryIds: [],
        emailRestricted: false,
        published: true,
        ...c,
        code: c.code.trim().toLowerCase(),
      };
      coupons.set(full.code, full);
    },
    async findCoupon(code) {
      const c = coupons.get(code.trim().toLowerCase());
      return c ? structuredClone(c) : null;
    },
    /** Category id the mock gave a name (so tests can build restricted coupons). */
    categoryIdFor: categoryId,
    async createDesignProduct(input) {
      const existing = designProducts.get(input.templateId);
      if (existing)
        return { wooProductId: existing.wooProductId, slug: existing.slug };
      const made = {
        wooProductId: nextDesignProductId++,
        slug: `design-${input.templateId}`,
        status: "draft" as const,
        input: structuredClone(input),
      };
      designProducts.set(input.templateId, made);
      return { wooProductId: made.wooProductId, slug: made.slug };
    },
    async getDesignProduct(templateId) {
      const p = designProducts.get(templateId);
      if (!p || p.status !== "publish") return null;
      return {
        wooProductId: p.wooProductId,
        templateId,
        slug: p.slug,
        baseProductId: p.input.baseProductId,
        name: p.input.name,
        descriptionHtml: descriptionHtml(p.input.description),
        pricePkr: p.input.pricePkr,
        categoryIds: (p.input.categories ?? []).map(categoryId),
      };
    },
    async listDesignProducts(templateIds) {
      const out = [];
      for (const id of templateIds) {
        const info = await this.getDesignProduct(id);
        if (info) out.push(info);
      }
      return out;
    },
    async publishDesignProduct(wooProductId) {
      for (const p of designProducts.values())
        if (p.wooProductId === wooProductId) p.status = "publish";
    },
    quoteShipping: async (city) => ({
      city,
      shippingPkr: SHIPPING_PKR[city] ?? DEFAULT_SHIPPING_PKR,
    }),

    async createOrder(input: CreateOrderInput) {
      const existing = byCheckout.get(input.checkoutId);
      if (existing !== undefined) return structuredClone(must(existing));
      const lines = input.lines.map((line) => {
        if (line.templateId) {
          const d = designProducts.get(line.templateId);
          if (!d || d.status !== "publish")
            throw new Error(`Design ${line.templateId} is unavailable`);
          return { ...line, unitPricePkr: d.input.pricePkr };
        }
        const variant = find(line.productId)?.variants.find(
          (v) =>
            v.colourId === line.colourId &&
            (line.size === undefined || v.size === line.size),
        );
        if (!variant)
          throw new Error(
            `Unknown product/colour ${line.productId}/${line.colourId}`,
          );
        return { ...line, unitPricePkr: variant.pricePkr };
      });
      const shipCity = input.delivery?.city ?? input.customer.city;
      let shippingPkr = SHIPPING_PKR[shipCity] ?? DEFAULT_SHIPPING_PKR;
      const subtotal = lines.reduce(
        (s, l) => s + l.unitPricePkr * l.quantity,
        0,
      );
      let discountPkr = 0;
      if (input.couponCode) {
        const coupon = coupons.get(normalizeCouponCode(input.couponCode));
        const result = evaluateCoupon(
          coupon ?? null,
          lines.map((l) => {
            const design = l.templateId
              ? designProducts.get(l.templateId)
              : undefined;
            return {
              wooProductId:
                design?.wooProductId ?? find(l.productId)?.wooProductId ?? 0,
              categoryIds: (design?.input.categories ?? []).map(categoryId),
              unitPricePkr: l.unitPricePkr,
              quantity: l.quantity,
            };
          }),
          new Date(now()),
        );
        if (!result.ok || !coupon)
          throw new Error(`Coupon ${input.couponCode} can't be used`);
        discountPkr = result.discountPkr;
        if (result.freeShipping) shippingPkr = 0;
        coupon.usageCount += 1;
      }
      const order: Order = {
        id: nextId++,
        status: "on-hold",
        createdAt: new Date(now()).toISOString(),
        // Like WooCommerce mapping: the delivery address wins over billing.
        customer: input.delivery
          ? {
              ...input.customer,
              fullName: input.delivery.fullName ?? input.customer.fullName,
              city: input.delivery.city,
              addressLine: input.delivery.addressLine,
              ...(input.delivery.landmark
                ? { landmark: input.delivery.landmark }
                : {}),
            }
          : input.customer,
        ...(input.email ? { email: input.email } : {}),
        lines,
        shippingPkr,
        ...(discountPkr > 0 ? { discountPkr } : {}),
        totalPkr: subtotal - discountPkr + shippingPkr,
        paymentMethod: "cod",
      };
      orders.set(order.id, order);
      extras.set(order.id, {
        customerId: input.customerId ?? 0,
        closedAt: null,
        meta: new Map(),
      });
      byCheckout.set(input.checkoutId, order.id);
      return structuredClone(order);
    },

    async findCustomerByEmail(email) {
      const c = byEmail(email);
      return c ? publicCustomer(c) : null;
    },
    async getCustomer(id) {
      const c = customers.get(id);
      return c ? publicCustomer(c) : null;
    },
    async createCustomer(input) {
      if (byEmail(input.email)) return null;
      const c = {
        id: nextCustomerId++,
        email: input.email.trim().toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        modifiedAt: new Date((clock += 1000)).toISOString(),
        password: input.password,
      };
      customers.set(c.id, c);
      return publicCustomer(c);
    },
    async verifyCustomerPassword(email, password) {
      const c = byEmail(email);
      return c && c.password === password ? publicCustomer(c) : null;
    },
    async updateCustomerProfile(id, profile) {
      const c = customers.get(id);
      if (!c) throw new Error(`Customer ${id} not found`);
      c.phone = profile.phone;
      c.address = {
        city: profile.city,
        addressLine: profile.addressLine,
        ...(profile.landmark ? { landmark: profile.landmark } : {}),
      };
      c.modifiedAt = new Date((clock += 1000)).toISOString();
    },
    async setCustomerPassword(id, password) {
      const c = customers.get(id);
      if (!c) throw new Error(`Customer ${id} not found`);
      c.password = password;
      c.modifiedAt = new Date((clock += 1000)).toISOString();
    },

    async updateCustomerAccount(id, update) {
      const c = mustCustomer(id);
      c.firstName = update.firstName;
      c.lastName = update.lastName;
      c.marketingOptIn = update.marketingOptIn;
      c.modifiedAt = new Date((clock += 1000)).toISOString();
    },
    async deleteCustomer(id) {
      customers.delete(id);
      savedDesigns.delete(id);
    },
    async listCustomerOrders(customerId, page = 1) {
      const all = ownOrders(customerId);
      const size = 20;
      return {
        orders: structuredClone(all.slice((page - 1) * size, page * size)),
        totalPages: Math.max(1, Math.ceil(all.length / size)),
      };
    },
    async getCustomerOrder(customerId, id) {
      const o = orders.get(id);
      return o && customerId > 0 && extras.get(id)?.customerId === customerId
        ? structuredClone(o)
        : null;
    },
    async listSavedDesigns(customerId) {
      mustCustomer(customerId);
      return parseSavedDesigns(
        structuredClone(savedDesigns.get(customerId) ?? []),
      );
    },
    async setSavedDesigns(customerId, designs) {
      mustCustomer(customerId);
      assertSavedDesignList(designs);
      savedDesigns.set(customerId, structuredClone(designs));
    },

    getOrder: async (id) => structuredClone(orders.get(id) ?? null),
    findOrderForTracking: async (id, phone) => {
      const o = orders.get(id);
      return o && o.customer.phone === phone ? structuredClone(o) : null;
    },
    async setOrderStatus(id: OrderId, status: OrderStatus) {
      const o = must(id);
      if (o.status === status) return;
      o.status = status;
      // Like WC: date_completed / date_modified move when the status changes.
      extras.get(id)!.closedAt =
        status === "completed" || status === "cancelled"
          ? new Date(now()).toISOString()
          : null;
    },
    async setLineFiles(id, lineIndex, files) {
      const line = must(id).lines[lineIndex];
      if (!line) throw new Error(`Order ${id} has no line ${lineIndex}`);
      Object.assign(line, files);
    },
    async addOrderNote() {
      /* notes are not kept in the mock */
    },
    async listOrdersForRetention(page) {
      const all = [...orders.values()].sort((a, b) => a.id - b.id);
      const slice = all.slice(
        (page - 1) * RETENTION_PAGE,
        page * RETENTION_PAGE,
      );
      return {
        orders: slice.map((o): RetentionOrder => {
          const x = extras.get(o.id)!;
          return {
            id: o.id,
            status: o.status,
            closedAt: x.closedAt,
            customerId: x.customerId,
            designIds: [
              ...new Set(o.lines.map((l) => l.designId).filter(Boolean)),
            ],
            retainForReview:
              (x.meta.get("_retain_for_review") ??
                x.meta.get("retain_for_review")) === "yes",
            retentionDoneAt: x.meta.get("_retention_done") ?? null,
          };
        }),
        total: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / RETENTION_PAGE)),
      };
    },
    async markRetentionDone(id, doneAt) {
      must(id);
      extras.get(id)!.meta.set("_retention_done", doneAt);
    },
    setOrderMeta(id, key, value) {
      must(id);
      extras.get(id)!.meta.set(key, value);
    },
    async verifyWebhook(rawBody: string): Promise<WebhookVerification> {
      // DEV ONLY: accepts any JSON body shaped like a WC order, no signature
      // check. getCommerce() refuses to use the mock in production.
      try {
        const body = JSON.parse(rawBody) as {
          id?: number;
          status?: OrderStatus;
        };
        if (typeof body.id !== "number" || !body.status)
          return { kind: "invalid" };
        const event: VerifiedWebhook = {
          topic: "order.updated",
          orderId: body.id,
          status: body.status,
          deliveryId: `mock-${body.id}-${body.status}`,
        };
        return { kind: "event", event };
      } catch {
        return { kind: "invalid" };
      }
    },
  };
}
