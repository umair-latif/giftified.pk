import "server-only";
import { getCommerce } from "@/lib/commerce";
import type { DeliveryRates } from "@/lib/delivery";

/** Every delivery rate from the store; null when it can't be reached or isn't set up. */
export async function loadDeliveryRates(): Promise<DeliveryRates | null> {
  try {
    return await getCommerce().shippingRates();
  } catch {
    return null;
  }
}
