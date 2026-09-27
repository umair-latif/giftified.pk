import type { ProductId } from "@/config/products";
import type {
  CreateOrderInput,
  Order,
  OrderId,
  OrderStatus,
} from "@/types/order";
import type { CatalogProduct, CommerceClient, VerifiedWebhook } from "./types";

/**
 * In-memory store for local development and tests. Deterministic prices so
 * UI and tests can assert on them. Replace via `getCommerce()` once
 * WooCommerce credentials are configured.
 */
const CATALOG: CatalogProduct[] = [
  {
    productId: "mug",
    wooProductId: 101,
    name: "Custom Mug",
    basePricePkr: 1499,
    variants: [
      {
        colourId: "white",
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

export function createMockCommerce(): CommerceClient {
  const orders = new Map<OrderId, Order>();
  const byCheckout = new Map<string, OrderId>();
  let nextId = 1000;

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
      const shippingPkr =
        SHIPPING_PKR[input.customer.city] ?? DEFAULT_SHIPPING_PKR;
      const subtotal = lines.reduce(
        (s, l) => s + l.unitPricePkr * l.quantity,
        0,
      );
      const order: Order = {
        id: nextId++,
        status: "on-hold",
        createdAt: new Date().toISOString(),
        customer: input.customer,
        lines,
        shippingPkr,
        totalPkr: subtotal + shippingPkr,
        paymentMethod: "cod",
      };
      orders.set(order.id, order);
      byCheckout.set(input.checkoutId, order.id);
      return structuredClone(order);
    },

    getOrder: async (id) => structuredClone(orders.get(id) ?? null),
    async setOrderStatus(id: OrderId, status: OrderStatus) {
      must(id).status = status;
    },
    async setLineFiles(id, lineIndex, files) {
      const line = must(id).lines[lineIndex];
      if (!line) throw new Error(`Order ${id} has no line ${lineIndex}`);
      Object.assign(line, files);
    },
    async addOrderNote() {
      /* notes are not kept in the mock */
    },
    async verifyWebhook(rawBody: string): Promise<VerifiedWebhook | null> {
      // The mock accepts any JSON body shaped like a WC order; no signature check.
      try {
        const body = JSON.parse(rawBody) as {
          id?: number;
          status?: OrderStatus;
        };
        if (typeof body.id !== "number" || !body.status) return null;
        return {
          topic: "order.updated",
          orderId: body.id,
          status: body.status,
          deliveryId: `mock-${body.id}-${body.status}`,
        };
      } catch {
        return null;
      }
    },
  };
}
