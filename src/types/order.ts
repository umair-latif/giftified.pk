import type { ProductId } from "@/config/products";

/**
 * SHARED CONTRACT — order domain types used by checkout, commerce adapter,
 * worker jobs, messaging and the vendor PDF. Change only with lead approval.
 */

/** WooCommerce order ID. */
export type OrderId = number;

/**
 * Lifecycle, mapped 1:1 to WooCommerce built-in statuses:
 *  on-hold    = placed, waiting for COD confirmation (MVP: founder calls/messages)
 *  processing = customer confirmed; print files sent to vendor (MVP: by hand)
 *  completed  = delivered, cash collected
 *  cancelled  = customer declined or never confirmed
 */
export type OrderStatus = "on-hold" | "processing" | "completed" | "cancelled";

/** E.164 Pakistani mobile, e.g. "+923001234567". */
export type PkMobile = `+92${string}`;

export interface CustomerDetails {
  fullName: string;
  phone: PkMobile;
  city: string;
  addressLine: string;
  /** Optional landmark / notes — very common in Pakistani addresses. */
  landmark?: string;
}

export interface OrderLineInput {
  productId: ProductId;
  /** Links to WC product/variation; resolved by the commerce adapter. */
  colourId: string;
  size?: string;
  quantity: number;
  /** ID of the saved DesignDocument in storage. */
  designId: string;
}

export interface CreateOrderInput {
  customer: CustomerDetails;
  /** Optional, for the receipt and WooCommerce's order emails. Lower-cased. */
  email?: string;
  /** WooCommerce customer ID when signed in (task 20). */
  customerId?: number;
  lines: OrderLineInput[];
  /** Idempotency key generated on the client per checkout attempt. */
  checkoutId: string;
}

export interface OrderLine extends OrderLineInput {
  /** Unit price in PKR (integer rupees), as priced by WooCommerce. */
  unitPricePkr: number;
  /** Filled in by the worker once rendered. */
  printPngUrl?: string;
  proofPdfUrl?: string;
}

/** Set by the founder in WP admin when the parcel ships (order custom fields). */
export interface OrderTracking {
  /** `_courier`, e.g. "TCS", "Leopards", "M&P". */
  courier: string;
  /** `_tracking_number`. */
  number: string;
  /** `_tracking_url`, optional. */
  url?: string;
}

export interface Order {
  id: OrderId;
  status: OrderStatus;
  createdAt: string; // ISO 8601
  customer: CustomerDetails;
  email?: string;
  tracking?: OrderTracking;
  lines: OrderLine[];
  shippingPkr: number;
  totalPkr: number;
  paymentMethod: "cod";
}
