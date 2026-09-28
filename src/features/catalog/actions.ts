"use server";

import { z } from "zod";
import { canonicalCity } from "@/config/cities";
import { getCommerce } from "@/lib/commerce";

export type DeliveryQuote =
  { ok: true; city: string; shippingPkr: number } | { ok: false };

const citySchema = z.string().trim().min(2).max(60);

/** Delivery cost to a city, for the estimate on product pages. */
export async function quoteDeliveryAction(
  city: unknown,
): Promise<DeliveryQuote> {
  const parsed = citySchema.safeParse(city);
  if (!parsed.success) return { ok: false };
  try {
    const q = await getCommerce().quoteShipping(canonicalCity(parsed.data));
    return { ok: true, city: q.city, shippingPkr: q.shippingPkr };
  } catch {
    return { ok: false };
  }
}
