import type { ProductId } from "@/config/products";
import type {
  CreateOrderInput,
  Order,
  OrderId,
  OrderStatus,
  PkMobile,
} from "@/types/order";

/**
 * SHARED CONTRACT — everything the app needs from the store backend.
 * Implemented by `woocommerce.ts` (real) and `mock.ts` (dev/tests).
 * Server-only: never import from client components.
 */
export interface CatalogImage {
  src: string;
  alt: string;
}

export interface CatalogVariant {
  colourId: string;
  /** Display name and swatch from WooCommerce (task 11); fall back to config. */
  colourName?: string;
  colourHex?: `#${string}`;
  size?: string;
  /** WooCommerce variation ID. */
  wooVariationId: number;
  pricePkr: number;
  inStock: boolean;
}

export interface CatalogProduct {
  productId: ProductId;
  wooProductId: number;
  /** URL slug for /products/[slug]. */
  slug: string;
  name: string;
  /** Plain text, one or two sentences (task 11). */
  shortDescription?: string;
  /** Sanitised HTML (task 11). */
  descriptionHtml?: string;
  /** Product gallery, first = main image. May be empty. */
  images: CatalogImage[];
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
  /**
   * Guest tracking: the order, only if `phone` (E.164) matches its customer
   * phone; otherwise null (same result as "no such order").
   */
  findOrderForTracking(id: OrderId, phone: PkMobile): Promise<Order | null>;
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
   * and parses the payload.
   */
  verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): Promise<WebhookVerification>;
}

/**
 * Result of checking a webhook delivery.
 * - `event`: authentic and something we act on.
 * - `ignored`: authentic, but a topic/status/payload we don't handle. Must be
 *   answered 200: WooCommerce DISABLES a webhook after repeated non-2xx replies.
 * - `invalid`: bad or missing signature → 401.
 */
export type WebhookVerification =
  | { kind: "event"; event: VerifiedWebhook }
  | { kind: "ignored"; reason: string }
  | { kind: "invalid" };
