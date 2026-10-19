import { describe, expect, it, vi } from "vitest";
import {
  handleReviewWebhook,
  isReviewTopic,
} from "@/features/reviews/review-webhook";
import { signWooPayload } from "@/lib/commerce/woo-webhook";

const SECRET = "whsec_test";
const body = JSON.stringify({ id: 42, comment_approved: 1 });
const post = (raw: string, headers: Record<string, string>) =>
  new Request("https://app.test/api/webhooks/reviews", {
    method: "POST",
    body: raw,
    headers,
  });
const signed = (topic: string, raw = body) => ({
  "x-wc-webhook-topic": topic,
  "x-wc-webhook-signature": signWooPayload(raw, SECRET),
});

describe("POST /api/webhooks/reviews", () => {
  it("drops the review cache on a signed review or comment delivery", async () => {
    // WooCommerce has no review.* topic of its own, so the one that actually
    // arrives is the Action webhook on comment_unapproved_to_approved.
    for (const topic of [
      "action.comment_unapproved_to_approved",
      "action.wp_set_comment_status",
      "review.created",
      "review.updated",
    ]) {
      const refresh = vi.fn();
      const res = await handleReviewWebhook(
        post(body, signed(topic)),
        SECRET,
        refresh,
      );
      expect(res.status).toBe(200);
      expect(refresh).toHaveBeenCalledOnce();
    }
  });

  it("rejects a bad or missing signature with 401 and drops nothing", async () => {
    const refresh = vi.fn();
    const tampered = body.replace("42", "43");
    const bad = await handleReviewWebhook(
      post(tampered, signed("review.created")),
      SECRET,
      refresh,
    );
    expect(bad.status).toBe(401);

    const none = await handleReviewWebhook(
      post(body, { "x-wc-webhook-topic": "review.created" }),
      SECRET,
      refresh,
    );
    expect(none.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    const refresh = vi.fn();
    const res = await handleReviewWebhook(
      post(body, signed("review.created")),
      undefined,
      refresh,
    );
    expect(res.status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("acknowledges an authentic off-topic delivery without dropping the cache", async () => {
    // 200, so WooCommerce doesn't disable the webhook after repeated failures.
    const refresh = vi.fn();
    const res = await handleReviewWebhook(
      post(body, signed("order.updated")),
      SECRET,
      refresh,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ignored: "topic order.updated" });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("answers WooCommerce's ping without a signature", async () => {
    const refresh = vi.fn();
    const res = await handleReviewWebhook(
      post("webhook_id=1", { "x-wc-webhook-topic": "review.created" }),
      SECRET,
      refresh,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ping: true });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("knows which topics mean a review may have changed", () => {
    expect(isReviewTopic("action.comment_unapproved_to_approved")).toBe(true);
    expect(isReviewTopic("review.deleted")).toBe(true);
    expect(isReviewTopic("action.woocommerce_add_to_cart")).toBe(false);
    expect(isReviewTopic("product.updated")).toBe(false);
    expect(isReviewTopic("")).toBe(false);
  });
});
