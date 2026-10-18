import "server-only";
import { getCommerce } from "@/lib/commerce";
import type { Review } from "@/lib/commerce/types";

/**
 * Approved reviews of a product. A failing store must never break a product
 * page, so any error means "no reviews" (and is logged).
 */
export async function loadReviews(wooProductId: number): Promise<Review[]> {
  try {
    return await getCommerce().listReviews(wooProductId);
  } catch (err) {
    console.error(
      `[reviews] couldn't load reviews of product ${wooProductId}`,
      err,
    );
    return [];
  }
}
