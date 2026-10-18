import type { VerifiedWebhook } from "@/lib/commerce/types";
import type { OrderId, OrderStatus } from "@/types/order";

/**
 * Queue events. Kept free of the Inngest SDK so the webhook decision logic is
 * unit-testable without a queue.
 */
export const ORDER_FILES_EVENT = "order/files.requested";

export interface OrderFilesEvent {
  name: typeof ORDER_FILES_EVENT;
  /**
   * Dedupe key per (order, status): Inngest ignores a second event with the
   * same id for 24 h, so WooCommerce re-deliveries and our own order.updated
   * echoes (from writing the file links) never start a second run. Setting the
   * order to Processing gives one more chance if the first run failed; the
   * job skips lines that already have files, so that run is usually a no-op.
   */
  id: string;
  data: { orderId: OrderId };
}

/**
 * Order confirmed (Processing) → email the admin "Send to vendor" once.
 * Dedupe id per order: re-deliveries and our own order.updated echoes (notes,
 * file links) within 24 h never send a second email.
 */
export const VENDOR_HANDOFF_EVENT = "order/vendor.handoff";

export interface VendorHandoffEvent {
  name: typeof VENDOR_HANDOFF_EVENT;
  id: string;
  data: { orderId: OrderId };
}

export const vendorHandoffEvent = (orderId: OrderId): VendorHandoffEvent => ({
  name: VENDOR_HANDOFF_EVENT,
  id: `vendor-handoff-${orderId}`,
  data: { orderId },
});

/**
 * Order completed (delivered, cash collected) → email the customer a link to
 * review it (task 30). Dedupe id per order for 24 h; the job itself also keeps
 * a marker in storage, so a later status flip never sends a second email.
 */
export const REVIEW_REQUEST_EVENT = "order/review.requested";

export interface ReviewRequestEvent {
  name: typeof REVIEW_REQUEST_EVENT;
  id: string;
  data: { orderId: OrderId };
}

export const reviewRequestEvent = (orderId: OrderId): ReviewRequestEvent => ({
  name: REVIEW_REQUEST_EVENT,
  id: `review-request-${orderId}`,
  data: { orderId },
});

export type SendEvent = (
  event: OrderFilesEvent | VendorHandoffEvent | ReviewRequestEvent,
) => Promise<unknown>;

/** Orders that can still need print files: awaiting confirmation or confirmed. */
export function webhookWantsFiles(e: VerifiedWebhook): boolean {
  return e.status === "on-hold" || e.status === "processing";
}

export function orderFilesEvent(
  orderId: OrderId,
  status: OrderStatus,
): OrderFilesEvent {
  return {
    name: ORDER_FILES_EVENT,
    id: `order-files-${orderId}-${status}`,
    data: { orderId },
  };
}

/**
 * Webhook sink: log, enqueue the files job for live orders and, once an order
 * is confirmed (Processing), the vendor hand-off, and once it is completed the
 * review request email. Never throws —
 * the webhook must still answer 200 (WooCommerce disables webhooks after
 * repeated failures, and doesn't retry anyway). If enqueueing fails, the next
 * order.updated (e.g. the founder setting Processing) tries again, and
 * `pnpm order:files <id>` runs it by hand.
 */
export function createOrderFilesSink(
  send: SendEvent,
  log: Pick<Console, "info" | "error"> = console,
) {
  return async (e: VerifiedWebhook): Promise<void> => {
    log.info(
      `[commerce-webhook] ${e.topic} order=${e.orderId} status=${e.status} delivery=${e.deliveryId}`,
    );
    if (e.status === "completed") {
      try {
        await send(reviewRequestEvent(e.orderId));
      } catch (err) {
        log.error(
          `[commerce-webhook] couldn't queue the review request for order ${e.orderId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      return;
    }
    if (!webhookWantsFiles(e)) return;
    try {
      await send(orderFilesEvent(e.orderId, e.status));
    } catch (err) {
      log.error(
        `[commerce-webhook] couldn't queue print files for order ${e.orderId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (e.status !== "processing") return;
    try {
      await send(vendorHandoffEvent(e.orderId));
    } catch (err) {
      log.error(
        `[commerce-webhook] couldn't queue the vendor hand-off for order ${e.orderId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}
