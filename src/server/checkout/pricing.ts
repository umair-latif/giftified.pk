import "server-only";
import { canonicalCity } from "@/config/cities";
import type { ProductId } from "@/config/products";
import type { CommerceClient } from "@/lib/commerce";
import {
  couponMessage,
  evaluateCoupon,
  normalizeCouponCode,
  type CouponLine,
} from "@/lib/coupons";

export interface PricingLine {
  productId: ProductId;
  colourId: string;
  size?: string;
  quantity: number;
  /** Design product (task 26): priced from its own WooCommerce product. */
  templateId?: string;
}

export interface CartPricing {
  /** Per line, same order; null = no longer sold in this colour/size (or design). */
  unitPricePkr: (number | null)[];
  subtotalPkr: number;
  /** Per line: the ready-made design's title, or null for a plain product. */
  lineTitles: (string | null)[];
  /** Whole rupees off from the coupon (0 = none). */
  discountPkr: number;
  /** The accepted coupon code, lower-case. */
  couponCode?: string;
  /** Why a coupon was refused (customer-facing). */
  couponError?: string;
  /** null until a city is chosen. */
  shippingPkr: number | null;
  totalPkr: number;
}

/**
 * The one place a cart is priced: every price comes from the store (never the
 * client), then the coupon is checked against the priced lines. Used for the
 * cart/checkout summary AND again when the order is placed.
 */
export async function priceCart(
  commerce: CommerceClient,
  input: { lines: PricingLine[]; city: string; couponCode?: string },
  now: Date = new Date(),
): Promise<CartPricing> {
  const city = canonicalCity(input.city);
  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const templateIds = [
    ...new Set(
      input.lines.flatMap((l) => (l.templateId ? [l.templateId] : [])),
    ),
  ];
  const [products, designs, shipping] = await Promise.all([
    Promise.all(ids.map((id) => commerce.getProduct(id))),
    Promise.all(
      templateIds.map(
        async (id) => [id, await commerce.getDesignProduct(id)] as const,
      ),
    ).then((e) => new Map(e)),
    city.length >= 2 && input.lines.length > 0
      ? commerce.quoteShipping(city)
      : null,
  ]);

  const couponLines: CouponLine[] = [];
  const unitPricePkr = input.lines.map((l) => {
    const product = products[ids.indexOf(l.productId)];
    if (l.templateId) {
      const d = designs.get(l.templateId);
      // Same base product only: a design can't be repriced onto another product.
      if (!d || d.baseProductId !== l.productId) return null;
      couponLines.push({
        wooProductId: d.wooProductId,
        categoryIds: d.categoryIds ?? [],
        unitPricePkr: d.pricePkr,
        quantity: l.quantity,
      });
      return d.pricePkr;
    }
    const variant = product?.variants.find(
      (v) =>
        v.colourId === l.colourId &&
        (l.size === undefined ||
          v.size === undefined ||
          v.size.toLowerCase() === l.size.toLowerCase()),
    );
    if (product && variant)
      couponLines.push({
        wooProductId: product.wooProductId,
        categoryIds: product.categoryIds ?? [],
        unitPricePkr: variant.pricePkr,
        quantity: l.quantity,
      });
    return variant?.pricePkr ?? null;
  });
  const subtotalPkr = input.lines.reduce(
    (s, l, i) => s + (unitPricePkr[i] ?? 0) * l.quantity,
    0,
  );

  let discountPkr = 0;
  let couponCode: string | undefined;
  let couponError: string | undefined;
  let freeShipping = false;
  if (input.couponCode?.trim() && couponLines.length > 0) {
    const code = normalizeCouponCode(input.couponCode);
    const result = evaluateCoupon(
      await commerce.findCoupon(code),
      couponLines,
      now,
    );
    if (result.ok) {
      discountPkr = result.discountPkr;
      freeShipping = result.freeShipping;
      couponCode = code;
    } else couponError = couponMessage(result);
  }

  const shippingPkr = shipping
    ? freeShipping
      ? 0
      : shipping.shippingPkr
    : null;
  return {
    unitPricePkr,
    lineTitles: input.lines.map((l) =>
      l.templateId ? (designs.get(l.templateId)?.name ?? null) : null,
    ),
    subtotalPkr,
    discountPkr,
    ...(couponCode ? { couponCode } : {}),
    ...(couponError ? { couponError } : {}),
    shippingPkr,
    totalPkr: subtotalPkr - discountPkr + (shippingPkr ?? 0),
  };
}
