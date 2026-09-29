import { describe, expect, it } from "vitest";
import {
  couponMessage,
  evaluateCoupon,
  normalizeCouponCode,
  type Coupon,
  type CouponLine,
} from "@/lib/coupons";

const base: Coupon = {
  code: "eid15",
  kind: "percent",
  amount: 15,
  freeShipping: false,
  usageCount: 0,
  productIds: [],
  excludedProductIds: [],
  categoryIds: [],
  excludedCategoryIds: [],
  emailRestricted: false,
  published: true,
};
const plain: CouponLine = {
  wooProductId: 10,
  categoryIds: [1],
  unitPricePkr: 1000,
  quantity: 2,
};
const designed: CouponLine = {
  wooProductId: 77,
  categoryIds: [2, 5],
  unitPricePkr: 1899,
  quantity: 1,
};
const now = new Date("2026-09-30T00:00:00Z");
const ev = (c: Partial<Coupon> | null, lines = [plain, designed]) =>
  evaluateCoupon(c && { ...base, ...c }, lines, now);

describe("coupon evaluation", () => {
  it("percent applies to every line by default", () => {
    // 15% of 2000 = 300, 15% of 1899 = 284.85 → 285
    expect(ev({})).toEqual({ ok: true, discountPkr: 585, freeShipping: false });
  });

  it("product restriction: only the design product's line (Ready-made tier / one design)", () => {
    expect(ev({ productIds: [77] })).toEqual({
      ok: true,
      discountPkr: 285,
      freeShipping: false,
    });
    expect(ev({ productIds: [10] })).toMatchObject({ discountPkr: 300 });
  });

  it("category restriction and exclusions", () => {
    expect(ev({ categoryIds: [5] })).toMatchObject({ discountPkr: 285 }); // e.g. the Eid category
    expect(ev({ excludedCategoryIds: [5] })).toMatchObject({
      discountPkr: 300,
    });
    expect(ev({ excludedProductIds: [10] })).toMatchObject({
      discountPkr: 285,
    });
  });

  it("fixed cart discount is capped at the eligible items", () => {
    expect(ev({ kind: "fixed_cart", amount: 500 })).toMatchObject({
      discountPkr: 500,
    });
    expect(
      ev({ kind: "fixed_cart", amount: 5000, productIds: [77] }),
    ).toMatchObject({ discountPkr: 1899 });
  });

  it("fixed product discount is per unit, never more than the price", () => {
    expect(ev({ kind: "fixed_product", amount: 100 })).toMatchObject({
      discountPkr: 300,
    }); // 2×100 + 1×100
    expect(
      ev({ kind: "fixed_product", amount: 5000, productIds: [10] }),
    ).toMatchObject({ discountPkr: 2000 });
  });

  it("refuses unknown, unpublished, expired, used-up and unsupported coupons", () => {
    expect(ev(null)).toEqual({ ok: false, reason: "unknown" });
    expect(ev({ published: false })).toEqual({ ok: false, reason: "unknown" });
    expect(ev({ expiresAt: "2026-09-29T23:59:59Z" })).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(ev({ expiresAt: "2026-10-01T00:00:00Z" }).ok).toBe(true);
    expect(ev({ usageLimit: 5, usageCount: 5 })).toEqual({
      ok: false,
      reason: "used_up",
    });
    expect(ev({ emailRestricted: true })).toEqual({
      ok: false,
      reason: "unsupported",
    });
  });

  it("minimum and maximum spend use the whole cart", () => {
    expect(ev({ minSubtotalPkr: 5000 })).toEqual({
      ok: false,
      reason: "min_spend",
      minSubtotalPkr: 5000,
    });
    expect(ev({ minSubtotalPkr: 3899 }).ok).toBe(true);
    expect(ev({ maxSubtotalPkr: 3000 })).toEqual({
      ok: false,
      reason: "max_spend",
    });
  });

  it("a coupon for products that aren't in the cart is refused; free shipping alone is fine", () => {
    expect(ev({ productIds: [999] })).toEqual({
      ok: false,
      reason: "not_applicable",
    });
    expect(ev({ productIds: [999], freeShipping: true })).toEqual({
      ok: true,
      discountPkr: 0,
      freeShipping: true,
    });
  });

  it("codes are matched lower-case and trimmed; messages are friendly", () => {
    expect(normalizeCouponCode("  EID15 ")).toBe("eid15");
    expect(
      couponMessage({ ok: false, reason: "min_spend", minSubtotalPkr: 5000 }),
    ).toBe("Spend Rs 5,000 or more to use this coupon.");
    expect(couponMessage({ ok: false, reason: "unknown" })).toMatch(
      /don’t recognise/,
    );
  });
});
