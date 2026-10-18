import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { createMockCommerce } = await import("@/lib/commerce/mock");

const input = {
  wooProductId: 101,
  rating: 5,
  text: "Great",
  reviewer: "Sana",
  reviewerEmail: "s@example.com",
};

describe("mock commerce — reviews", () => {
  it("holds a new review until it is approved", async () => {
    const c = createMockCommerce();
    const r = await c.createReview(input);
    expect(r.verified).toBe(true);
    expect(await c.listReviews(101)).toEqual([]);
    c.approveReview(r.id);
    expect(await c.listReviews(101)).toEqual([r]);
    expect(await c.listReviews(999)).toEqual([]);
  });
});
