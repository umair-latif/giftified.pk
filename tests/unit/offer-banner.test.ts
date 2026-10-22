import { afterEach, describe, expect, it } from "vitest";
import { OFFER, offerIsLive } from "@/config/site";

const saved = { ...OFFER };
afterEach(() => Object.assign(OFFER, saved));

describe("offer bar", () => {
  it("is off until switched on", () => {
    expect(OFFER.enabled).toBe(false);
    expect(offerIsLive()).toBe(false);
  });

  it("shows while enabled and hides itself after endsAt", () => {
    OFFER.enabled = true;
    expect(offerIsLive()).toBe(true);
    OFFER.endsAt = "2026-11-30T23:59:59+05:00";
    expect(offerIsLive(Date.parse("2026-11-30T12:00:00+05:00"))).toBe(true);
    expect(offerIsLive(Date.parse("2026-12-01T00:00:01+05:00"))).toBe(false);
  });

  it("links to the all-mugs design filter", () => {
    expect(OFFER.href).toBe("/designs?product=mugs");
  });
});
