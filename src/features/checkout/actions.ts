"use server";

import { z } from "zod";
import { canonicalCity } from "@/config/cities";
import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { designKey } from "@/lib/storage/keys";
import { orderStatusUrl } from "@/server/orders/order-link";
import type { ProductId } from "@/config/products";
import type { OrderId } from "@/types/order";
import {
  DESIGN_NOT_SAVED,
  MAX_QUANTITY,
  parseCheckout,
  type FieldErrors,
} from "./schema";

/**
 * Server Actions for the Order step. They are public HTTP endpoints: every
 * argument is validated here, and prices always come from the store.
 */

export interface OrderQuote {
  unitPricePkr: number;
  /** null until a city is chosen. */
  shippingPkr: number | null;
  totalPkr: number;
}

const quoteInput = z.object({
  productId: z.string().max(40),
  colourId: z.string().max(40),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
  city: z.string().max(60),
});

/** Estimate for the order summary. The final total is whatever createOrder returns. */
export async function quoteOrder(input: unknown): Promise<OrderQuote | null> {
  const r = quoteInput.safeParse(input);
  if (!r.success) return null;
  const { productId, colourId, quantity } = r.data;
  const city = canonicalCity(r.data.city);
  const commerce = getCommerce();
  const [product, shipping] = await Promise.all([
    commerce.getProduct(productId as ProductId),
    city.length >= 2 ? commerce.quoteShipping(city) : null,
  ]);
  const variant = product?.variants.find((v) => v.colourId === colourId);
  if (!variant) return null;
  const shippingPkr = shipping?.shippingPkr ?? null;
  return {
    unitPricePkr: variant.pricePkr,
    shippingPkr,
    totalPkr: variant.pricePkr * quantity + (shippingPkr ?? 0),
  };
}

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: OrderId;
      /** Private status page (task 14 enforces the token). */ statusUrl: string;
    }
  | { ok: false; errors: FieldErrors; message?: string };

/** Creates the COD order (status on-hold). Idempotent on `checkoutId`. */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = parseCheckout(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  try {
    // The print job needs the uploaded design; never create an order without it.
    for (const line of parsed.order.lines) {
      if (!(await getStorage().head(designKey(line.designId))))
        return {
          ok: false,
          errors: { designId: DESIGN_NOT_SAVED },
          message: DESIGN_NOT_SAVED,
        };
    }
    const order = await getCommerce().createOrder(parsed.order);
    return { ok: true, orderId: order.id, statusUrl: orderStatusUrl(order) };
  } catch (err) {
    console.error("[checkout] createOrder failed", err);
    return {
      ok: false,
      errors: {},
      message:
        "We couldn’t place your order just now. Please check your connection and try again.",
    };
  }
}
