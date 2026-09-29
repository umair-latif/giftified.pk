"use server";

import { z } from "zod";
import { canonicalCity } from "@/config/cities";
import type { ProductId } from "@/config/products";
import { getCommerce } from "@/lib/commerce";
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
});

export interface CartQuote {
  /** Per line, same order; null = no longer sold in this colour/size. */
  unitPricePkr: (number | null)[];
  subtotalPkr: number;
  /** null until a city is chosen. */
  shippingPkr: number | null;
  totalPkr: number;
}

export async function quoteCart(raw: unknown): Promise<CartQuote | null> {
  const r = input.safeParse(raw);
  if (!r.success) return null;
  const commerce = getCommerce();
  const city = canonicalCity(r.data.city);
  const ids = [...new Set(r.data.lines.map((l) => l.productId))];
  const [products, shipping] = await Promise.all([
    Promise.all(ids.map((id) => commerce.getProduct(id as ProductId))),
    city.length >= 2 && r.data.lines.length > 0
      ? commerce.quoteShipping(city)
      : null,
  ]);
  const designs = new Map(
    await Promise.all(
      [
        ...new Set(
          r.data.lines.flatMap((l) => (l.templateId ? [l.templateId] : [])),
        ),
      ].map(async (id) => [id, await commerce.getDesignProduct(id)] as const),
    ),
  );
  const unitPricePkr = r.data.lines.map((l) => {
    if (l.templateId) {
      const d = designs.get(l.templateId);
      // Same base product only: a design can't be repriced onto another product.
      return d && d.baseProductId === l.productId ? d.pricePkr : null;
    }
    const product = products[ids.indexOf(l.productId)];
    const variant = product?.variants.find(
      (v) =>
        v.colourId === l.colourId &&
        (l.size === undefined ||
          v.size === undefined ||
          v.size.toLowerCase() === l.size.toLowerCase()),
    );
    return variant?.pricePkr ?? null;
  });
  const subtotalPkr = r.data.lines.reduce(
    (s, l, i) => s + (unitPricePkr[i] ?? 0) * l.quantity,
    0,
  );
  const shippingPkr = shipping?.shippingPkr ?? null;
  return {
    unitPricePkr,
    subtotalPkr,
    shippingPkr,
    totalPkr: subtotalPkr + (shippingPkr ?? 0),
  };
}
