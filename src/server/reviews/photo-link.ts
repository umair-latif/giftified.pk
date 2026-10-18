import { createHmac, timingSafeEqual } from "node:crypto";
import { appBaseUrl, fileLinkSecret } from "@/server/files/links";

/**
 * Stable, unguessable link to a review's photo:
 * `/api/reviews/photo/<orderId>-<line>.<signature>`. It never expires (it is
 * written into the review text and shown on the shop); the route turns it
 * into a short-lived private storage link. Only the link holder can open a
 * photo whose review is still on hold.
 */
const DEV_SECRET = "giftified-dev-review-photos";

function secretFor(env: Record<string, string | undefined>): string {
  const secret = fileLinkSecret(env);
  if (secret) return secret;
  if (env.NODE_ENV !== "production" || env.COMMERCE_MOCK === "1")
    return DEV_SECRET;
  return "";
}

function sign(orderId: number, line: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(`review-photo:${orderId}:${line}`)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

export function reviewPhotoPath(
  orderId: number,
  line: number,
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = secretFor(env);
  if (!secret) throw new Error("Review photo link secret is not configured");
  return `/api/reviews/photo/${orderId}-${line}.${sign(orderId, line, secret)}`;
}

export function reviewPhotoUrl(
  orderId: number,
  line: number,
  env: Record<string, string | undefined> = process.env,
): string {
  return `${appBaseUrl(env)}${reviewPhotoPath(orderId, line, env)}`;
}

/** The order and line behind `<orderId>-<line>.<signature>`, or null. */
export function verifyReviewPhotoRef(
  ref: string,
  env: Record<string, string | undefined> = process.env,
): { orderId: number; line: number } | null {
  const secret = secretFor(env);
  const m = /^(\d{1,12})-(\d{1,2})\.([\w-]{22})$/.exec(ref);
  if (!secret || !m) return null;
  const orderId = Number(m[1]);
  const line = Number(m[2]);
  const expected = Buffer.from(sign(orderId, line, secret));
  const given = Buffer.from(m[3]!);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? { orderId, line }
    : null;
}
