"use client";

import { useState, useSyncExternalStore } from "react";
import { CityPicker } from "@/features/checkout/components/city-picker";
import { formatPkr } from "@/features/checkout/format";
import { useDeliveryRates } from "@/features/checkout/use-delivery-rates";
import {
  arrivalRange,
  DELIVERY_DAYS,
  feeFor,
  formatArrival,
  maxFee,
  type DeliveryRates,
} from "@/lib/delivery";

const CITY_KEY = "giftified:city";

function readCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
}

const noopSubscribe = () => () => {};

function saveCity(city: string) {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    /* private mode / storage blocked: the estimate still works this visit */
  }
}

/**
 * "Delivery to Khanewal · Rs 300 · arrives 21–25 Oct". Before a city is set it
 * says what's true everywhere (rendered on the server, so never empty). The
 * fee follows the same rule as checkout: the city's own rate, else the rate
 * for everywhere else. The city is remembered on this phone and pre-fills checkout.
 */
export function DeliveryEstimate({
  rates: serverRates,
}: {
  rates: DeliveryRates | null;
}) {
  const rates = useDeliveryRates(serverRates);
  // The city remembered on this phone ("" on the server and first paint).
  const saved = useSyncExternalStore(noopSubscribe, readCity, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const city = typed ?? saved;
  const committed = picked ?? saved;

  const commit = (c: string) => {
    const t = c.trim();
    if (t.length < 2) return;
    setPicked(t);
    saveCity(t);
  };

  const top = rates ? maxFee(rates) : null;
  const quote = committed && rates ? feeFor(committed, rates) : null;
  const days = `${DELIVERY_DAYS.min}–${DELIVERY_DAYS.max} days`;

  return (
    <div className="space-y-2">
      <label htmlFor="city" className="text-ink block text-sm font-semibold">
        Delivery to your city
      </label>
      <CityPicker
        value={city}
        onChange={setTyped}
        onCommit={commit}
        invalid={false}
        describedBy="delivery-result"
        rates={rates}
      />
      <p
        id="delivery-result"
        className="text-ink min-h-6 text-sm"
        aria-live="polite"
        data-testid="delivery-result"
      >
        {quote ? (
          <>
            Delivery to {quote.city}
            {quote.shippingPkr !== null && (
              <>
                {" · "}
                <strong className="font-semibold">
                  {formatPkr(quote.shippingPkr)}
                </strong>
              </>
            )}
            {" · "}
            <strong className="font-semibold">
              Arrives {formatArrival(arrivalRange(new Date()))}
            </strong>
          </>
        ) : (
          <>
            Delivery anywhere in Pakistan
            {top !== null && ` · ${formatPkr(top)} or less`} · arrives in {days}
          </>
        )}
      </p>
      <p className="text-ink/70 text-sm">
        Pay cash when it arrives. We call or WhatsApp you to confirm before
        printing.
      </p>
    </div>
  );
}
