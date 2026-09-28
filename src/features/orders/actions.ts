"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCommerce } from "@/lib/commerce";
import { orderStatusUrl } from "@/server/orders/order-link";
import { createRateLimiter } from "./rate-limit";
import {
  clientKeyFromHeaders,
  TRACK_LIMIT,
  TRACK_WINDOW_MS,
  trackOrder,
  type TrackState,
} from "./track";

/**
 * In-memory, per server instance — fine for the MVP's single server; see the
 * note in rate-limit.ts before scaling out. Counts FAILED lookups only, so
 * customers sharing a mobile-carrier IP (CGNAT) aren't locked out by each
 * other's successful lookups.
 */
const limiter = createRateLimiter({
  limit: TRACK_LIMIT,
  windowMs: TRACK_WINDOW_MS,
});

/** `/track` form → private order link. A public endpoint: validates everything. */
export async function trackOrderAction(
  _prev: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const orderNumber = formData.get("orderNumber");
  const phone = formData.get("phone");
  const result = await trackOrder(
    { orderNumber, phone },
    {
      commerce: getCommerce(),
      limiter,
      clientKey: clientKeyFromHeaders(await headers()),
    },
  );
  if (!result.ok)
    return {
      status: "error",
      values: {
        orderNumber:
          typeof orderNumber === "string" ? orderNumber.slice(0, 20) : "",
        phone: typeof phone === "string" ? phone.slice(0, 30) : "",
      },
      ...(result.message ? { message: result.message } : {}),
      ...(result.fieldErrors ? { fieldErrors: result.fieldErrors } : {}),
    };
  redirect(orderStatusUrl(result.order));
}
