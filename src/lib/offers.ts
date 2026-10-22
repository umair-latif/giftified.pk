import { offerIsLive } from "@/config/site";

/**
 * The launch offer (pilot): buy one mug, get one free. The lower-priced mug is
 * free, once per order, mugs only (Custom and Dual Accent together), whatever
 * else is in the cart. Delivery is not discounted. Switched with `OFFER` in
 * config/site.ts. It never stacks with a coupon.
 */
export const OFFER_MUG_PRODUCT_IDS: readonly string[] = ["mug", "two-tone-mug"];

/** Name of the negative fee line on the WooCommerce order, and the cart/checkout row. */
export const OFFER_NAME = "Launch offer: buy 1 mug, get 1 free";

export const OFFER_COUPON_MESSAGE =
  "Coupons can't be combined with the launch offer.";

export interface OfferLine {
  productId: string;
  /** Unit price in whole rupees, as priced by the store. */
  unitPricePkr: number;
  quantity: number;
}

/**
 * Rupees off: the price of the cheapest mug when the cart holds two or more
 * mugs, else 0. Pure; does not check whether the offer is switched on.
 */
export function mugOfferDiscountPkr(lines: readonly OfferLine[]): number {
  let mugs = 0;
  let cheapest = Number.POSITIVE_INFINITY;
  for (const l of lines) {
    if (!OFFER_MUG_PRODUCT_IDS.includes(l.productId) || l.quantity < 1)
      continue;
    mugs += l.quantity;
    cheapest = Math.min(cheapest, l.unitPricePkr);
  }
  return mugs >= 2 && Number.isFinite(cheapest) ? cheapest : 0;
}

/** `mugOfferDiscountPkr` while the offer is live (config/site.ts), else 0. */
export function launchOfferDiscountPkr(
  lines: readonly OfferLine[],
  now?: number,
): number {
  return offerIsLive(now) ? mugOfferDiscountPkr(lines) : 0;
}
