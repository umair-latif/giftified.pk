"use server";

import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { designKey } from "@/lib/storage/keys";
import { orderStatusUrl } from "@/server/orders/order-link";
import type { OrderId } from "@/types/order";
import { DESIGN_NOT_SAVED, parseCheckout, type FieldErrors } from "./schema";

/**
 * Server Action for /checkout. A public HTTP endpoint: every argument is
 * validated here, and prices always come from the store (the summary uses
 * `quoteCart` from `src/features/cart/actions.ts`).
 */

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: OrderId;
      /** Private status page: /order/<id>?t=<token>. */
      statusUrl: string;
    }
  | { ok: false; errors: FieldErrors; message?: string };

/** Creates one COD order (status on-hold) for the whole cart. Idempotent on `checkoutId`. */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = parseCheckout(input);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  try {
    // The print job needs every uploaded design; never create an order without them.
    const designIds = [...new Set(parsed.order.lines.map((l) => l.designId))];
    const found = await Promise.all(
      designIds.map((id) => getStorage().head(designKey(id))),
    );
    if (found.some((f) => !f))
      return {
        ok: false,
        errors: { lines: DESIGN_NOT_SAVED },
        message: DESIGN_NOT_SAVED,
      };
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
