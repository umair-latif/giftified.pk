import { canonicalCity, cityKey } from "@/config/cities";

/**
 * Delivery promise (Help: printing 1–3 days after you confirm, then 5–7 days
 * by courier). Calendar days, counted from today in Pakistan.
 */
export const PRINT_DAYS = { min: 1, max: 3 } as const;
export const COURIER_DAYS = { min: 5, max: 7 } as const;
export const DELIVERY_DAYS = {
  min: PRINT_DAYS.min + COURIER_DAYS.min,
  max: PRINT_DAYS.max + COURIER_DAYS.max,
} as const;

export interface DeliveryRates {
  cities: readonly { city: string; shippingPkr: number }[];
  /** Everywhere else in Pakistan; null when the store has no such rate. */
  otherCitiesPkr: number | null;
}

/** Today's date in Pakistan as a UTC-midnight Date (time zone safe). */
function pkToday(now: Date): Date {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** First and last likely arrival day for an order placed now. */
export function arrivalRange(now: Date): { from: Date; to: Date } {
  const today = pkToday(now);
  return {
    from: addDays(today, DELIVERY_DAYS.min),
    to: addDays(today, DELIVERY_DAYS.max),
  };
}

/** "21–25 Oct", "30 Oct – 3 Nov", "29 Dec – 2 Jan". */
export function formatArrival({ from, to }: { from: Date; to: Date }): string {
  const day = (d: Date) => d.getUTCDate();
  const mon = (d: Date) =>
    d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return from.getUTCMonth() === to.getUTCMonth()
    ? `${day(from)}–${day(to)} ${mon(to)}`
    : `${day(from)} ${mon(from)} – ${day(to)} ${mon(to)}`;
}

/** The highest rate anywhere ("Rs 300 or less"), or null without rates. */
export function maxFee(rates: DeliveryRates): number | null {
  const all = [
    ...rates.cities.map((c) => c.shippingPkr),
    ...(rates.otherCitiesPkr === null ? [] : [rates.otherCitiesPkr]),
  ];
  return all.length ? Math.max(...all) : null;
}

/**
 * Fee for a city as typed: its own rate when WooCommerce has one, else the
 * "everywhere else" rate. Same rule as the server (`quoteFromZones`).
 */
export function feeFor(
  typed: string,
  rates: DeliveryRates,
): { city: string; shippingPkr: number | null } {
  const city = canonicalCity(
    typed,
    rates.cities.map((c) => c.city),
  );
  const own = rates.cities.find((c) => cityKey(c.city) === cityKey(city));
  return { city, shippingPkr: own?.shippingPkr ?? rates.otherCitiesPkr };
}
