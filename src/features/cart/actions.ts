"use server";

import { z } from "zod";
import { getCommerce } from "@/lib/commerce";
import { priceCart, type CartPricing } from "@/server/checkout/pricing";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "@/types/cart";

/**
 * Prices for the cart page. A public endpoint: input is validated and every
 * price comes from the store; the cart itself never holds prices.
 */
const input = z.object({
  lines: z
    .array(
      z.object({
        productId: z.enum(["mug", "tshirt", "hoodie"]),
        colourId: z.string().max(40),
        size: z.string().max(10).optional(),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
        /** Design product (task 26): priced from its own WooCommerce product. */
        templateId: z
          .string()
          .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/)
          .optional(),
      }),
    )
    .max(MAX_CART_LINES),
  city: z.string().max(60).default(""),
  /** Coupon code the customer typed (checked by the server, never trusted). */
  couponCode: z.string().max(60).optional(),
});

export type CartQuote = CartPricing;

export async function quoteCart(raw: unknown): Promise<CartQuote | null> {
  const r = input.safeParse(raw);
  if (!r.success) return null;
  return priceCart(getCommerce(), r.data);
}
