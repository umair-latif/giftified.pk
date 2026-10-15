"use server";

import type { DeliveryRates } from "@/lib/delivery";
import { loadDeliveryRates } from "./load-rates";

/** Every delivery rate, for the city field. Null when the store can't be reached. */
export async function deliveryRatesAction(): Promise<DeliveryRates | null> {
  return loadDeliveryRates();
}
