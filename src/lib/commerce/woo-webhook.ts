import { createHmac, timingSafeEqual } from "node:crypto";
import type { VerifiedWebhook, WebhookTopic } from "./types";
import { mapStatus } from "./woo-map";
import { wooWebhookOrderSchema } from "./woo-schemas";

/**
 * WooCommerce webhook signing: `X-WC-Webhook-Signature` is the base64
 * HMAC-SHA256 of the RAW request body, keyed with the webhook secret.
 * Always verify before parsing — never re-serialise the JSON first.
 */
export function signWooPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
}

export function isValidWooSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signWooPayload(rawBody, secret));
  const given = Buffer.from(signature.trim());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * When a webhook is created (or re-activated) WooCommerce sends an unsigned
 * form-encoded ping `webhook_id=<n>`. It must get a 200 or WC marks the
 * delivery URL as failing.
 */
export function isWooPing(rawBody: string, headers: Headers): boolean {
  return (
    !headers.get("x-wc-webhook-signature") &&
    /^webhook_id=\d+$/.test(rawBody.trim())
  );
}

const TOPICS: readonly WebhookTopic[] = ["order.created", "order.updated"];

/** Signature check + payload parse. Null for bad signatures or payloads. */
export function verifyWooWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): VerifiedWebhook | null {
  if (
    !isValidWooSignature(rawBody, headers.get("x-wc-webhook-signature"), secret)
  )
    return null;

  const topic = headers.get("x-wc-webhook-topic");
  if (!topic || !(TOPICS as readonly string[]).includes(topic)) return null;

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const body = wooWebhookOrderSchema.safeParse(json);
  if (!body.success) return null;
  const status = mapStatus(body.data.status);
  if (!status) return null;

  return {
    topic: topic as WebhookTopic,
    orderId: body.data.id,
    status,
    deliveryId:
      headers.get("x-wc-webhook-delivery-id") ??
      `${body.data.id}-${body.data.status}`,
  };
}
