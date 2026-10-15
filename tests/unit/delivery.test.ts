import { describe, expect, it } from "vitest";
import {
  arrivalRange,
  DELIVERY_DAYS,
  feeFor,
  formatArrival,
  maxFee,
} from "@/lib/delivery";

const rates = {
  cities: [
    { city: "Lahore", shippingPkr: 200 },
    { city: "Rawalpindi", shippingPkr: 250 },
    { city: "Jhelum", shippingPkr: 150 },
  ],
  otherCitiesPkr: 300,
};

describe("delivery dates", () => {
  it("is 6–10 days: 1–3 print days + 5–7 courier days", () => {
    expect(DELIVERY_DAYS).toEqual({ min: 6, max: 10 });
  });

  it("counts from today in Pakistan and formats one range", () => {
    // 15 Oct 2026, 10:00 PKT → arrives 21–25 Oct (the handoff's example).
    const r = arrivalRange(new Date("2026-10-15T05:00:00Z"));
    expect(formatArrival(r)).toBe("21–25 Oct");
    // 23:30 UTC on the 15th is already the 16th in Pakistan.
    expect(formatArrival(arrivalRange(new Date("2026-10-15T23:30:00Z")))).toBe(
      "22–26 Oct",
    );
  });

  it("spans months and years", () => {
    expect(formatArrival(arrivalRange(new Date("2026-10-25T06:00:00Z")))).toBe(
      "31 Oct – 4 Nov",
    );
    expect(formatArrival(arrivalRange(new Date("2026-12-26T06:00:00Z")))).toBe(
      "1–5 Jan",
    );
  });
});

describe("delivery fee", () => {
  it("uses a city's own rate, else the rate for everywhere else", () => {
    expect(feeFor("lahore", rates)).toEqual({
      city: "Lahore",
      shippingPkr: 200,
    });
    expect(feeFor("Pindi", rates)).toEqual({
      city: "Rawalpindi",
      shippingPkr: 250,
    });
    expect(feeFor("jhelum ", rates)).toEqual({
      city: "Jhelum",
      shippingPkr: 150,
    });
    expect(feeFor("Khanewal", rates)).toEqual({
      city: "Khanewal",
      shippingPkr: 300,
    });
    expect(feeFor("Mehrabpur", { ...rates, otherCitiesPkr: null })).toEqual({
      city: "Mehrabpur",
      shippingPkr: null,
    });
  });

  it("knows the highest rate", () => {
    expect(maxFee(rates)).toBe(300);
    expect(maxFee({ cities: [], otherCitiesPkr: null })).toBeNull();
  });
});

describe("rates from WooCommerce zones", () => {
  it("lists each named city with its rate and finds the rest-of-Pakistan rate", async () => {
    const { ratesFromZones } = await import("@/lib/commerce/woo-map");
    const zone = (id: number, name: string, order: number, cost?: string) => ({
      zone: { id, name, order },
      methods: cost
        ? [
            {
              instance_id: id,
              method_id: "flat_rate",
              enabled: true,
              order: 0,
              settings: { cost: { value: cost } },
            },
          ]
        : [],
    });
    const rates = ratesFromZones([
      zone(1, "Lahore", 0, "200"),
      zone(2, "Islamabad, Rawalpindi", 1, "250"),
      zone(3, "Gujrat, Sialkot, Jhelum", 2, "150"),
      zone(4, "Rest of Pakistan", 3, "300"),
      zone(0, "Locations not covered by your other zones", 9),
    ] as never);
    expect(rates.cities).toEqual([
      { city: "Lahore", shippingPkr: 200 },
      { city: "Islamabad", shippingPkr: 250 },
      { city: "Rawalpindi", shippingPkr: 250 },
      { city: "Gujrat", shippingPkr: 150 },
      { city: "Sialkot", shippingPkr: 150 },
      { city: "Jhelum", shippingPkr: 150 },
    ]);
    expect(rates.otherCitiesPkr).toBe(300);
  });
});
