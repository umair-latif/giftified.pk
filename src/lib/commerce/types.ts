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

/** A WooCommerce customer (the account store, task 20). */
export interface Customer {
  id: number;
  /** Lower-cased. */
  email: string;
  firstName: string;
  lastName: string;
  /**
   * When the customer record last changed (ISO 8601). Password-reset links
   * embed it, so changing the password makes an old link stop working.
   */
  modifiedAt: string;
  /** Saved billing phone (as typed in WP admin or checkout), if any. */
  phone?: string;
  /** Saved address, if any: fills checkout for signed-in customers. */
  address?: { city: string; addressLine: string; landmark?: string };
}

/** What checkout saves to the account when the customer ticks "save my details". */
export interface CustomerProfileUpdate {
  phone: string;
  city: string;
  addressLine: string;
  landmark?: string;
}

export interface NewCustomer {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export type WebhookTopic = "order.created" | "order.updated";

export interface VerifiedWebhook {
  topic: WebhookTopic;
  orderId: OrderId;
  status: OrderStatus;
  /** WooCommerce delivery ID, used as an idempotency key. */
  deliveryId: string;
}

/**
 * One order as the retention job (task 24) sees it. Deliberately every
 * status, not just closed ones: the job must know which designs are still
 * used by open, recent, signed-in or refused orders before deleting any.
 */
export interface RetentionOrder {
  id: OrderId;
  /** Raw WooCommerce status ("completed", "on-hold", "refunded", …). */
  status: string;
  /**
   * When the order became completed/cancelled (ISO 8601, UTC); null for any
   * other status. completed → `date_completed_gmt` (else `date_modified_gmt`);
   * cancelled → `date_modified_gmt` (WC stores no cancellation date).
   */
  closedAt: string | null;
  /** WooCommerce customer ID; 0 = guest order. */
  customerId: number;
  /** `_design_id` of each line (empty ones left out). */
  designIds: string[];
  /** Order meta `_retain_for_review` = "yes" (refused content): never purge. */
  retainForReview: boolean;
  /** Order meta `_retention_done` (ISO 8601) once files were purged. */
  retentionDoneAt: string | null;
}

export interface RetentionOrderPage {
  orders: RetentionOrder[];
  /** Total orders / pages at the time of this request (X-WP-Total, X-WP-TotalPages). */
  total: number;
  totalPages: number;
}

/**
 * A published design sold as its own WooCommerce SIMPLE product (task 26):
 * WooCommerce holds title, description, price, status and image; the design
 * itself stays in our storage, linked by `_template_id`.
 */
export interface NewDesignProduct {
  /** Our template id (unique): becomes SKU `design-<id>` and product meta. */
  templateId: string;
  /** The base product the design is printed on (mug…). */
  baseProductId: ProductId;
  name: string;
  /** Plain text; paragraphs split on blank lines. */
  description: string;
  /** Whole rupees. */
  pricePkr: number;
}

export interface DesignProduct {
  wooProductId: number;
  slug: string;
}

/** What the shop knows about a PUBLISHED design product (source of truth: WooCommerce). */
export interface DesignProductInfo {
  wooProductId: number;
  templateId: string;
  slug: string;
  baseProductId: ProductId;
  name: string;
  /** HTML from the WP editor; sanitised before it reaches a page. */
  descriptionHtml: string;
  /** Current price in whole rupees (sale price applied). */
  pricePkr: number;
  imageUrl?: string;
}

export interface CommerceClient {
  listProducts(): Promise<CatalogProduct[]>;
  getProduct(productId: ProductId): Promise<CatalogProduct | null>;
  quoteShipping(city: string): Promise<ShippingQuote>;

  /**
   * Creates the design's simple product as a DRAFT (never on the base-product
   * catalog: its SKU is `design-<templateId>`). Idempotent on `templateId`.
   */
  createDesignProduct(input: NewDesignProduct): Promise<DesignProduct>;
  /** The published design product, or null when unknown, draft or unpublished. */
  getDesignProduct(templateId: string): Promise<DesignProductInfo | null>;
  /** Publishes it, with an image WooCommerce downloads from `imageUrl` (skipped if that download fails). */
  publishDesignProduct(
    wooProductId: number,
    opts: { imageUrl?: string },
  ): Promise<void>;

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

  // Accounts (task 20): WooCommerce customers are the accounts.
  findCustomerByEmail(email: string): Promise<Customer | null>;
  getCustomer(id: number): Promise<Customer | null>;
  /** Creates the customer; null when the email is already registered. */
  createCustomer(input: NewCustomer): Promise<Customer | null>;
  /**
   * Checks email + password (WooCommerce: the JWT Authentication plugin).
   * Null for a wrong password or unknown email — never says which.
   * `clientIp` is passed on so WordPress' login limiter sees the customer,
   * not our server.
   */
  verifyCustomerPassword(
    email: string,
    password: string,
    clientIp?: string,
  ): Promise<Customer | null>;
  setCustomerPassword(id: number, password: string): Promise<void>;
  /** Saves the customer's phone and address (WooCommerce billing). */
  updateCustomerProfile(
    id: number,
    profile: CustomerProfileUpdate,
  ): Promise<void>;

  /**
   * Retention job (task 24): page `page` (1-based, 100 per page) of ALL
   * orders in every status except trash, oldest ID first, so pages stay
   * stable while new orders arrive.
   */
  listOrdersForRetention(page: number): Promise<RetentionOrderPage>;
  /** Sets order meta `_retention_done` = `doneAt` (ISO 8601). */
  markRetentionDone(id: OrderId, doneAt: string): Promise<void>;

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
