import { createHmac, timingSafeEqual } from "node:crypto";
import { fileLinkSecret } from "@/server/files/links";
import type { OrderId, PkMobile } from "@/types/order";

/**
 * Private order-status links: /order/<id>?t=<token>. The token is an HMAC of
 * the order ID and the customer's phone, so knowing (or guessing) an order
 * number isn't enough to open it. No expiry: the customer keeps the link.
 * Same secret family as the file links (FILES_LINK_SECRET or derived from
 * WC_WEBHOOK_SECRET), separate purpose string.
 */
/** Local dev and demo builds (COMMERCE_MOCK=1) have no secret; never used for a real store. */
const DEV_SECRET = "giftified-dev-order-links";

function secretFor(env: Record<string, string | undefined>): string {
  const secret = fileLinkSecret(env);
  if (secret) return secret;
  if (env.NODE_ENV !== "production" || env.COMMERCE_MOCK === "1")
    return DEV_SECRET;
  return "";
}

function sign(id: OrderId, phone: PkMobile, secret: string): string {
  return createHmac("sha256", secret)
    .update(`order-link:${id}:${phone}`)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

export function orderToken(
  id: OrderId,
  phone: PkMobile,
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = secretFor(env);
  if (!secret) throw new Error("Order link secret is not configured");
  return sign(id, phone, secret);
}

export function verifyOrderToken(
  id: OrderId,
  phone: PkMobile,
  token: string | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const secret = secretFor(env);
  if (!secret || !token) return false;
  const expected = Buffer.from(sign(id, phone, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Relative URL of the order status page, e.g. for redirects after checkout. */
export function orderStatusUrl(
  order: { id: OrderId; customer: { phone: PkMobile } },
  env: Record<string, string | undefined> = process.env,
): string {
  return `/order/${order.id}?t=${orderToken(order.id, order.customer.phone, env)}`;
}
