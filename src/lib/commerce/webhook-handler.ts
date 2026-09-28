import type { CommerceClient, VerifiedWebhook } from "./types";
import { isWooPing } from "./woo-webhook";

export type WebhookSink = (event: VerifiedWebhook) => void | Promise<void>;

/** Until the queue/worker exists (task 08) verified events are only logged. */
export const logWebhook: WebhookSink = (e) => {
  console.info(
    `[commerce-webhook] ${e.topic} order=${e.orderId} status=${e.status} delivery=${e.deliveryId}`,
  );
};

/**
 * `POST /api/webhooks/commerce`. Reads the RAW body (the signature covers the
 * exact bytes), verifies, and acks fast. Real work happens in the worker, so
 * `sink` must only enqueue.
 */
export async function handleCommerceWebhook(
  req: Request,
  commerce: CommerceClient,
  sink: WebhookSink = logWebhook,
): Promise<Response> {
  const rawBody = await req.text();
  if (isWooPing(rawBody, req.headers))
    return Response.json({ ok: true, ping: true });

  const result = await commerce.verifyWebhook(rawBody, req.headers);
  if (result.kind === "invalid")
    return Response.json(
      { ok: false, error: "invalid signature" },
      { status: 401 },
    );
  if (result.kind === "ignored") {
    // Authentic but not for us: still 200, or WooCommerce disables the webhook.
    console.info(`[commerce-webhook] ignored: ${result.reason}`);
    return Response.json({ ok: true, ignored: result.reason });
  }

  await sink(result.event);
  return Response.json({ ok: true });
}
