import { describe, expect, it, vi } from "vitest";
import { handleCatalogWebhook } from "@/features/catalog/catalog-webhook";
import { signWooPayload } from "@/lib/commerce/woo-webhook";

const SECRET = "whsec_test";
const body = JSON.stringify({ id: 101, sku: "mug", price: "1599" });
const post = (raw: string, headers: Record<string, string>) =>
  new Request("https://app.test/api/webhooks/catalog", {
    method: "POST",
    body: raw,
    headers,
  });
const signed = (topic: string, raw = body) => ({
  "x-wc-webhook-topic": topic,
  "x-wc-webhook-signature": signWooPayload(raw, SECRET),
});

describe("POST /api/webhooks/catalog", () => {
  it("refreshes the catalog cache on a signed product.* delivery", async () => {
    for (const topic of [
      "product.updated",
      "product.created",
      "product.deleted",
    ]) {
      const refresh = vi.fn();
      const res = await handleCatalogWebhook(
        post(body, signed(topic)),
        SECRET,
        refresh,
      );
      expect(res.status).toBe(200);
      expect(refresh).toHaveBeenCalledOnce();
    }
  });

  it("rejects bad or missing signatures with 401 and refreshes nothing", async () => {
    const refresh = vi.fn();
    const tampered = body.replace("1599", "1");
    expect(
      (
        await handleCatalogWebhook(
          post(tampered, signed("product.updated")),
          SECRET,
          refresh,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handleCatalogWebhook(
          post(body, { "x-wc-webhook-topic": "product.updated" }),
          SECRET,
          refresh,
        )
      ).status,
    ).toBe(401);
    // No secret configured (mock mode): nothing is trusted.
    expect(
      (
        await handleCatalogWebhook(
          post(body, signed("product.updated")),
          undefined,
          refresh,
        )
      ).status,
    ).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("answers WooCommerce's ping and other authentic topics with 200, without refreshing", async () => {
    const refresh = vi.fn();
    const ping = await handleCatalogWebhook(
      post("webhook_id=5", {
        "content-type": "application/x-www-form-urlencoded",
      }),
      SECRET,
      refresh,
    );
    expect(ping.status).toBe(200);
    const order = await handleCatalogWebhook(
      post(body, signed("order.updated")),
      SECRET,
      refresh,
    );
    expect(order.status).toBe(200);
    expect(await order.json()).toEqual({
      ok: true,
      ignored: "topic order.updated",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
