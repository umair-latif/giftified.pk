import { isValidWooSignature, isWooPing } from "@/lib/commerce/woo-webhook";

/**
 * `POST /api/webhooks/catalog` — WooCommerce "Product updated/created/deleted"
 * webhooks. Same signature check and secret as the order webhook. A verified
 * `product.*` delivery refreshes the cached catalog; anything else authentic
 * is acknowledged with 200 so WooCommerce keeps the webhook enabled.
 */
export async function handleCatalogWebhook(
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
  if (!topic.startsWith("product."))
    return Response.json({ ok: true, ignored: `topic ${topic || "(none)"}` });

  refresh();
  console.info(`[catalog-webhook] ${topic}: catalog cache refreshed`);
  return Response.json({ ok: true, refreshed: true });
}
