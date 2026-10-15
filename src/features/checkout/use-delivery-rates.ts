"use client";

import { useEffect, useState } from "react";
import { deliveryRatesAction } from "@/features/catalog/actions";
import type { DeliveryRates } from "@/lib/delivery";

let loading: Promise<DeliveryRates | null> | undefined;

function loadRates(): Promise<DeliveryRates | null> {
  loading ??= deliveryRatesAction().then((r) => {
    if (!r) loading = undefined; // try again next time
    return r;
  });
  return loading;
}

/**
 * The store's delivery rates, loaded once per visit and shared by every city
 * field. `initial` (rendered on the server, e.g. the product page) is used
 * straight away. Null until loaded or when the store can't be reached.
 */
export function useDeliveryRates(
  initial?: DeliveryRates | null,
): DeliveryRates | null {
  const [loaded, setLoaded] = useState<DeliveryRates | null>(null);
  const need = !initial;
  useEffect(() => {
    if (!need) return;
    let live = true;
    loadRates().then((r) => {
      if (live) setLoaded(r);
    });
    return () => {
      live = false;
    };
  }, [need]);
  return initial ?? loaded;
}
