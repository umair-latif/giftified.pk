import { isValidWooSignature, isWooPing } from "@/lib/commerce/woo-webhook";

/**
 * `POST /api/webhooks/reviews` — drops the cached review list so an approval
 * in WP admin shows on the shop within seconds instead of waiting for the
 * page to regenerate.
 *
 * **Optional.** WooCommerce has no `review.*` webhook topic: the core topics
 * are coupon, customer, order and product only. The shop is correct without
 * this route — approvals appear within the page's revalidate window (5 min) —
 * and this only makes them appear sooner.
 *
 * Two ways to feed it, both set up in WP admin (see
 * `docs/ops/woocommerce-staging.md`):
 *
 * - an **Action** webhook on `comment_unapproved_to_approved`, which arrives
 *   with topic `action.comment_unapproved_to_approved`;
 * - any plugin that emits a `review.*` topic.
 *
 * Reviews are WordPress comments, so a comment action fires for every comment,
 * not only reviews. That is harmless: the shop has no other comments, and the
 * worst case is dropping a cache entry that did not need dropping.
 *
 * Same secret and signature check as the order and catalog webhooks. Anything
 * authentic but off-topic is acknowledged with 200, so WooCommerce keeps the
 * webhook enabled instead of disabling it after repeated failures.
 */
export async function handleReviewWebhook(
  req: Request,
  secret: string | undefined,
  refresh: () => void,
): Promise<Response> {
  const raw = await req.text();
  if (isWooPing(raw, req.headers))
    return Response.json({ ok: true, ping: true });

  if (
    !secret ||
    !isValidWooSignature(raw, req.headers.get("x-wc-webhook-signature"), secret)
  )
    return Response.json(
      { ok: false, error: "invalid signature" },
      { status: 401 },
    );

  const topic = req.headers.get("x-wc-webhook-topic") ?? "";
  if (!isReviewTopic(topic))
    return Response.json({ ok: true, ignored: `topic ${topic || "(none)"}` });

  refresh();
  console.info(`[review-webhook] ${topic}: review cache dropped`);
  return Response.json({ ok: true, refreshed: true });
}

/** A `review.*` topic, or a comment action that can mean a review was approved. */
export function isReviewTopic(topic: string): boolean {
  return (
    topic.startsWith("review.") ||
    (topic.startsWith("action.") && topic.includes("comment"))
  );
}
