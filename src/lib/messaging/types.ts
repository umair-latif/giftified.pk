import type { OrderId, PkMobile } from "@/types/order";

/**
 * SHARED CONTRACT — WhatsApp messaging. POSTPONED for the MVP (manual confirmation and
 * vendor hand-off); kept so automation can be added later without touching callers. Implemented by the Meta WhatsApp
 * Cloud API adapter (real) and `mock.ts` (dev/tests). Server-only.
 */
export interface VerificationRequest {
  to: PkMobile;
  orderId: OrderId;
  customerName: string;
  /** One line per item, e.g. "Custom Mug (white) × 1". */
  itemsSummary: string;
  totalPkr: number;
  city: string;
  addressLine: string;
}

export interface VendorAlert {
  /** Vendor WhatsApp number, E.164. */
  to: `+${string}`;
  orderId: OrderId;
  productSummary: string;
  proofPdfUrl: string;
}

export type InboundIntent = "confirm" | "cancel" | "other";

export interface InboundMessage {
  from: PkMobile;
  /** Present when the reply is a button tap on a verification message. */
  orderId?: OrderId;
  intent: InboundIntent;
  text?: string;
  /** Provider message ID — idempotency key. */
  messageId: string;
}

export interface Messenger {
  /** Sends the approved "confirm your COD order" template with Confirm/Cancel buttons. */
  sendOrderVerification(
    req: VerificationRequest,
  ): Promise<{ messageId: string }>;
  sendVendorAlert(alert: VendorAlert): Promise<{ messageId: string }>;
  /** GET webhook handshake: returns the challenge to echo, or null to reject. */
  verifySubscription(params: URLSearchParams): string | null;
  /** Validates `X-Hub-Signature-256` and parses zero or more inbound messages. */
  parseInbound(
    rawBody: string,
    headers: Headers,
  ): Promise<InboundMessage[] | null>;
}
