import type { ProductId } from "@/config/products";
import type {
  CreateOrderInput,
  Order,
  OrderId,
  OrderStatus,
} from "@/types/order";

/**
 * SHARED CONTRACT — everything the app needs from the store backend.
 * Implemented by `woocommerce.ts` (real) and `mock.ts` (dev/tests).
 * Server-only: never import from client components.
 */
export interface CatalogVariant {
  colourId: string;
  size?: string;
  /** WooCommerce variation ID. */
  wooVariationId: number;
  pricePkr: number;
  inStock: boolean;
}

export interface CatalogProduct {
  productId: ProductId;
  wooProductId: number;
  name: string;
  basePricePkr: number;
  variants: CatalogVariant[];
}

export interface ShippingQuote {
  city: string;
  shippingPkr: number;
}

export type WebhookTopic = "order.created" | "order.updated";

export interface VerifiedWebhook {
  topic: WebhookTopic;
  orderId: OrderId;
  status: OrderStatus;
  /** WooCommerce delivery ID, used as an idempotency key. */
  deliveryId: string;
}

export interface CommerceClient {
  listProducts(): Promise<CatalogProduct[]>;
  getProduct(productId: ProductId): Promise<CatalogProduct | null>;
  quoteShipping(city: string): Promise<ShippingQuote>;

  /**
   * Re-prices every line from the store (never trust client prices) and creates
   * a COD order with status "on-hold". Must be idempotent on `checkoutId`.
   */
  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrder(id: OrderId): Promise<Order | null>;
  setOrderStatus(id: OrderId, status: OrderStatus): Promise<void>;
  /** Attach print/proof URLs to a line item (WC line-item meta_data). */
  setLineFiles(
    id: OrderId,
    lineIndex: number,
    files: { printPngUrl?: string; proofPdfUrl?: string },
  ): Promise<void>;
  /** Audit trail visible in WP admin. */
  addOrderNote(id: OrderId, note: string): Promise<void>;

  /**
   * Verifies `X-WC-Webhook-Signature` (base64 HMAC-SHA256 of the RAW body)
   * and parses the payload. Returns null when the signature is invalid.
   */
  verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<VerifiedWebhook | null>;
}
