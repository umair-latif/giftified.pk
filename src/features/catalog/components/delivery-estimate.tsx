"use client";

import { useEffect, useState, useTransition } from "react";
import { CityPicker } from "@/features/checkout/components/city-picker";
import { formatPkr } from "@/features/checkout/format";
import { quoteDeliveryAction, type DeliveryQuote } from "../actions";

const CITY_KEY = "giftified:city";

function readCity(): string {
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveCity(city: string) {
  try {
    localStorage.setItem(CITY_KEY, city);
  } catch {
    /* private mode / storage blocked: the estimate still works this visit */
  }
}

/** "Delivery to Lahore: Rs 200" — city remembered on this phone. */
export function DeliveryEstimate() {
  const [city, setCity] = useState("");
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [pending, startTransition] = useTransition();

  const commit = (c: string) => {
    const typed = c.trim();
    if (typed.length < 2) return;
    startTransition(async () => {
      const q = await quoteDeliveryAction(typed);
      setQuote(q);
      if (q.ok) {
        setCity(q.city);
        saveCity(q.city);
      }
    });
  };

  // Re-quote the city remembered on this phone; the field fills in with the answer.
  useEffect(() => {
    const saved = readCity();
    if (saved) commit(saved);
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor="city" className="block text-sm font-medium text-zinc-800">
        Delivery estimate — your city
      </label>
      <CityPicker
        value={city}
        onChange={(c) => {
          setCity(c);
          setQuote(null);
        }}
        onCommit={commit}
        invalid={quote?.ok === false}
        describedBy="delivery-result"
      />
      <p id="delivery-result" className="min-h-6 text-sm" aria-live="polite">
        {pending ? (
          <span className="text-zinc-500">Checking…</span>
        ) : quote?.ok ? (
          <>
            Delivery to {quote.city}:{" "}
            <strong className="font-semibold">
              {formatPkr(quote.shippingPkr)}
            </strong>
            <span className="text-zinc-600"> · pay cash when it arrives</span>
          </>
        ) : quote ? (
          <span className="text-red-700">
            We couldn&apos;t get a price for that city. You&apos;ll see it at
            checkout.
          </span>
        ) : null}
      </p>
    </div>
  );
}
