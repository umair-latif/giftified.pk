import type { ProductId } from "@/config/products";
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
} from "./types";

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
  });
  const byEmail = (email: string) =>
    [...customers.values()].find((c) => c.email === email.trim().toLowerCase());
  const RETENTION_PAGE = 100;
  const designProducts = new Map<
    string,
    DesignProduct & { status: "draft" | "publish"; input: NewDesignProduct }
  >();
  let nextDesignProductId = 9000;

  const find = (productId: ProductId) =>
    CATALOG.find((p) => p.productId === productId) ?? null;
  const must = (id: OrderId) => {
    const o = orders.get(id);
    if (!o) throw new Error(`Order ${id} not found`);
    return o;
  };

  return {
    listProducts: async () => structuredClone(CATALOG),
    getProduct: async (productId) => structuredClone(find(productId)),
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
        const variant = find(line.productId)?.variants.find(
          (v) => v.colourId === line.colourId,
        );
        if (!variant)
          throw new Error(
            `Unknown product/colour ${line.productId}/${line.colourId}`,
          );
        return { ...line, unitPricePkr: variant.pricePkr };
      });
      const shipCity = input.delivery?.city ?? input.customer.city;
      const shippingPkr = SHIPPING_PKR[shipCity] ?? DEFAULT_SHIPPING_PKR;
      const subtotal = lines.reduce(
        (s, l) => s + l.unitPricePkr * l.quantity,
        0,
      );
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
        totalPkr: subtotal + shippingPkr,
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
