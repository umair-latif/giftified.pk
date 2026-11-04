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

  it("keeps the hero sticker's badge lines short enough for the circle", () => {
    // Measured at 360 px and on desktop: these lengths fit with room to spare.
    const { top, big, bottom, strip } = OFFER.sticker;
    expect(top.length).toBeLessThanOrEqual(12);
    expect(big.length).toBeLessThanOrEqual(4);
    expect(bottom.length).toBeLessThanOrEqual(8);
    // The strip sits next to the badge on one line at 360 px.
    expect(strip.length).toBeLessThanOrEqual(20);
  });
});
