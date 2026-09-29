"use server";

import { headers } from "next/headers";
import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { designKey } from "@/lib/storage/keys";
import {
  getSessionCustomer,
  getSessionCustomerId,
} from "@/server/auth/cookies";
import { priceCart } from "@/server/checkout/pricing";
import { orderStatusUrl } from "@/server/orders/order-link";
import type { OrderId } from "@/types/order";
import { clientIpFromHeaders } from "./client-ip";
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
  const customerIp = clientIpFromHeaders(await headers());
  if (customerIp) parsed.order.customerIp = customerIp;
  // Signed in: the order joins the account ("My orders", task 21). Guests unchanged.
  const customerId = await getSessionCustomerId();
  if (customerId) parsed.order.customerId = customerId;
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
    const commerce = getCommerce();
    if (parsed.order.couponCode) {
      // Re-check at order time: prices and coupon rules come from the store.
      const priced = await priceCart(commerce, {
        lines: parsed.order.lines,
        city: parsed.order.delivery?.city ?? parsed.order.customer.city,
        couponCode: parsed.order.couponCode,
      });
      if (!priced.couponCode) {
        const message = `${priced.couponError ?? "This coupon can't be used."} Remove it and try again.`;
        return { ok: false, errors: {}, message };
      }
      parsed.order.couponCode = priced.couponCode;
    }
    const order = await commerce.createOrder(parsed.order);
    if (customerId && parsed.saveToAccount)
      // Best effort: never fail an order that is already placed.
      await commerce
        .updateCustomerProfile(customerId, {
          phone: parsed.order.customer.phone,
          city: parsed.order.customer.city,
          addressLine: parsed.order.customer.addressLine,
          ...(parsed.order.customer.landmark
            ? { landmark: parsed.order.customer.landmark }
            : {}),
        })
        .catch((err) => console.error("[checkout] saving profile failed", err));
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

/** What checkout can fill in for a signed-in customer. Every field is optional. */
export interface CheckoutPrefill {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  addressLine?: string;
  landmark?: string;
  /** True when the account has no address yet, so "save it" is offered ticked. */
  offerSave: boolean;
}

/**
 * Called by the checkout form on the client when the "signed in" cookie is
 * present (the page itself stays static). Null for guests.
 */
export async function getCheckoutPrefill(): Promise<CheckoutPrefill | null> {
  const c = await getSessionCustomer();
  if (!c) return null;
  const fullName = `${c.firstName} ${c.lastName}`.trim();
  return {
    ...(fullName ? { fullName } : {}),
    email: c.email,
    ...(c.phone ? { phone: c.phone } : {}),
    ...(c.address
      ? {
          city: c.address.city,
          addressLine: c.address.addressLine,
          ...(c.address.landmark ? { landmark: c.address.landmark } : {}),
        }
      : {}),
    offerSave: !c.address,
  };
}
