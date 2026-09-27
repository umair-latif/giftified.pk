import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createMockCommerce } from "@/lib/commerce/mock";
import type { CommerceClient } from "@/lib/commerce/types";
import { handleCommerceWebhook } from "@/lib/commerce/webhook-handler";
import {
  isValidWooSignature,
  signWooPayload,
  verifyWooWebhook,
} from "@/lib/commerce/woo-webhook";

const SECRET = "whsec_test";
// Raw bytes exactly as WooCommerce sent them — never re-serialise before signing.
const raw = readFileSync(
  new URL("../fixtures/woo/webhook-order-updated.json", import.meta.url),
  "utf8",
);

function headers(over: Record<string, string> = {}) {
  return new Headers({
    "content-type": "application/json",
    "x-wc-webhook-topic": "order.updated",
    "x-wc-webhook-delivery-id": "dlv-42",
    "x-wc-webhook-signature": signWooPayload(raw, SECRET),
    ...over,
  });
}

describe("WooCommerce webhook signature", () => {
  it("accepts a valid signature and parses the event", () => {
    expect(verifyWooWebhook(raw, headers(), SECRET)).toEqual({
      topic: "order.updated",
      orderId: 5123,
      status: "processing",
      deliveryId: "dlv-42",
    });
  });

  it("rejects a wrong secret", () => {
    const h = headers({
      "x-wc-webhook-signature": signWooPayload(raw, "nope"),
    });
    expect(verifyWooWebhook(raw, h, SECRET)).toBeNull();
  });

  it("rejects a tampered body", () => {
    const tampered = raw.replace('"processing"', '"completed"');
    expect(verifyWooWebhook(tampered, headers(), SECRET)).toBeNull();
  });

  it("rejects missing/garbage signatures without throwing", () => {
    expect(isValidWooSignature(raw, null, SECRET)).toBe(false);
    expect(isValidWooSignature(raw, "short", SECRET)).toBe(false);
    expect(isValidWooSignature(raw, signWooPayload(raw, SECRET), "")).toBe(
      false,
    );
  });

  it("ignores topics we don't handle", () => {
    const h = headers({ "x-wc-webhook-topic": "product.updated" });
    expect(verifyWooWebhook(raw, h, SECRET)).toBeNull();
  });
});

describe("POST /api/webhooks/commerce handler", () => {
  const wooLike: CommerceClient = {
    ...createMockCommerce(),
    verifyWebhook: async (body, h) => verifyWooWebhook(body, h, SECRET),
  };
  const post = (body: string, h: Headers) =>
    new Request("https://app.test/api/webhooks/commerce", {
      method: "POST",
      body,
      headers: h,
    });

  it("acks WooCommerce's unsigned ping with 200", async () => {
    const sink = vi.fn();
    const res = await handleCommerceWebhook(
      post(
        "webhook_id=17",
        new Headers({ "content-type": "application/x-www-form-urlencoded" }),
      ),
      wooLike,
      sink,
    );
    expect(res.status).toBe(200);
    expect(sink).not.toHaveBeenCalled();
  });

  it("returns 401 for a bad signature", async () => {
    const sink = vi.fn();
    const h = headers({ "x-wc-webhook-signature": "AAAA" });
    const res = await handleCommerceWebhook(post(raw, h), wooLike, sink);
    expect(res.status).toBe(401);
    expect(sink).not.toHaveBeenCalled();
  });

  it("returns 200 and hands the verified event to the sink", async () => {
    const sink = vi.fn();
    const res = await handleCommerceWebhook(
      post(raw, headers()),
      wooLike,
      sink,
    );
    expect(res.status).toBe(200);
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 5123,
        status: "processing",
        deliveryId: "dlv-42",
      }),
    );
  });
});
