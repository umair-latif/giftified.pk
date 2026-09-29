/**
 * Coupon rules (task 26, slice 5). Pure: the server evaluates them for the
 * cart quote and again when the order is placed; WooCommerce's own coupons are
 * the source of truth (the founder creates them in WP admin), read through
 * `CommerceClient.findCoupon`.
 *
 * Supported: percentage, fixed cart and fixed product discounts; expiry,
 * usage limit, minimum/maximum spend, free shipping, and product / category
 * restrictions (included and excluded). Not supported (the coupon is refused
 * rather than half-applied): email restrictions. Ignored: usage limit per
 * customer and "exclude sale items".
 */
export type CouponKind = "percent" | "fixed_cart" | "fixed_product";

export interface Coupon {
  /** Lower-cased, as WooCommerce stores it. */
  code: string;
  kind: CouponKind;
  /** Percent (0–100) or whole rupees. */
  amount: number;
  freeShipping: boolean;
  /** ISO 8601 (UTC), when set. */
  expiresAt?: string;
  usageLimit?: number;
  usageCount: number;
  minSubtotalPkr?: number;
  maxSubtotalPkr?: number;
  /** WooCommerce product ids; empty = every product. */
  productIds: number[];
  excludedProductIds: number[];
  categoryIds: number[];
  excludedCategoryIds: number[];
  /** True when the coupon is limited to certain emails (not supported online). */
  emailRestricted: boolean;
  published: boolean;
}

export interface CouponLine {
  /** WooCommerce product id the line is sold as (base product or design product). */
  wooProductId: number;
  categoryIds: number[];
  unitPricePkr: number;
  quantity: number;
}

export type CouponRefusal =
  | "unknown"
  | "expired"
  | "used_up"
  | "min_spend"
  | "max_spend"
  | "not_applicable"
  | "unsupported";

export type CouponResult =
  | { ok: true; discountPkr: number; freeShipping: boolean }
  | { ok: false; reason: CouponRefusal; minSubtotalPkr?: number };

export const normalizeCouponCode = (code: string) => code.trim().toLowerCase();

const eligible = (c: Coupon, l: CouponLine): boolean => {
  if (c.productIds.length && !c.productIds.includes(l.wooProductId))
    return false;
  if (c.excludedProductIds.includes(l.wooProductId)) return false;
  if (
    c.categoryIds.length &&
    !l.categoryIds.some((id) => c.categoryIds.includes(id))
  )
    return false;
  if (l.categoryIds.some((id) => c.excludedCategoryIds.includes(id)))
    return false;
  return true;
};

/** Checks a coupon against the cart and computes the discount (whole rupees, never more than the eligible items cost). */
export function evaluateCoupon(
  coupon: Coupon | null,
  lines: readonly CouponLine[],
  now: Date = new Date(),
): CouponResult {
  if (!coupon || !coupon.published) return { ok: false, reason: "unknown" };
  if (coupon.emailRestricted) return { ok: false, reason: "unsupported" };
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= now.getTime())
    return { ok: false, reason: "expired" };
  if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit)
    return { ok: false, reason: "used_up" };

  const subtotal = lines.reduce((s, l) => s + l.unitPricePkr * l.quantity, 0);
  if (coupon.minSubtotalPkr !== undefined && subtotal < coupon.minSubtotalPkr)
    return {
      ok: false,
      reason: "min_spend",
      minSubtotalPkr: coupon.minSubtotalPkr,
    };
  if (coupon.maxSubtotalPkr !== undefined && subtotal > coupon.maxSubtotalPkr)
    return { ok: false, reason: "max_spend" };

  const items = lines.filter((l) => eligible(coupon, l));
  const eligibleTotal = items.reduce(
    (s, l) => s + l.unitPricePkr * l.quantity,
    0,
  );
  // A coupon restricted to products the cart doesn't have does nothing (but
  // free shipping alone is still a valid coupon).
  if (items.length === 0 && !coupon.freeShipping)
    return { ok: false, reason: "not_applicable" };

  let discount = 0;
  if (coupon.kind === "percent")
    discount = items.reduce(
      (s, l) =>
        s + Math.round((l.unitPricePkr * l.quantity * coupon.amount) / 100),
      0,
    );
  else if (coupon.kind === "fixed_cart") discount = coupon.amount;
  else
    discount = items.reduce(
      (s, l) => s + Math.min(coupon.amount, l.unitPricePkr) * l.quantity,
      0,
    );
  discount = Math.max(0, Math.min(discount, eligibleTotal));
  if (discount === 0 && !coupon.freeShipping)
    return { ok: false, reason: "not_applicable" };
  return { ok: true, discountPkr: discount, freeShipping: coupon.freeShipping };
}

/** Customer-facing wording for a refusal. */
export function couponMessage(r: Extract<CouponResult, { ok: false }>): string {
  switch (r.reason) {
    case "expired":
      return "This coupon has expired.";
    case "used_up":
      return "This coupon has been used up.";
    case "min_spend":
      return r.minSubtotalPkr
        ? `Spend Rs ${r.minSubtotalPkr.toLocaleString("en-PK")} or more to use this coupon.`
        : "Your cart is below the minimum for this coupon.";
    case "max_spend":
      return "Your cart is above the maximum for this coupon.";
    case "not_applicable":
      return "This coupon doesn’t apply to what’s in your cart.";
    case "unsupported":
      return "This coupon can’t be used online yet. Message us and we’ll help.";
    default:
      return "We don’t recognise that coupon code.";
  }
}
