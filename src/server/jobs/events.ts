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

export type SendEvent = (event: OrderFilesEvent) => Promise<unknown>;

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
 * Webhook sink: log, and enqueue the files job for live orders. Never throws —
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
    if (!webhookWantsFiles(e)) return;
    try {
      await send(orderFilesEvent(e.orderId, e.status));
    } catch (err) {
      log.error(
        `[commerce-webhook] couldn't queue print files for order ${e.orderId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}
