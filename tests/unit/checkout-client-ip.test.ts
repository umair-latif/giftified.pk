import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "@/features/checkout/client-ip";

const ip = (h: Record<string, string>) => clientIpFromHeaders(new Headers(h));

describe("clientIpFromHeaders (customer IP for the order)", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(ip({ "x-forwarded-for": "39.45.12.7, 10.0.0.1, 172.16.0.2" })).toBe(
      "39.45.12.7",
    );
    expect(ip({ "x-forwarded-for": " 2001:db8::1 ,10.0.0.1" })).toBe(
      "2001:db8::1",
    );
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      ip({ "x-forwarded-for": "39.45.12.7", "x-real-ip": "10.0.0.1" }),
    ).toBe("39.45.12.7");
  });

  it("falls back to x-real-ip", () => {
    expect(ip({ "x-real-ip": "39.45.12.8" })).toBe("39.45.12.8");
    expect(ip({ "x-forwarded-for": "", "x-real-ip": "39.45.12.8" })).toBe(
      "39.45.12.8",
    );
  });

  it("strips a port", () => {
    expect(ip({ "x-forwarded-for": "39.45.12.7:51234" })).toBe("39.45.12.7");
    expect(ip({ "x-forwarded-for": "[2001:db8::1]:443" })).toBe("2001:db8::1");
  });

  it("ignores junk and falls back, or returns nothing", () => {
    for (const junk of [
      "unknown",
      "<script>",
      "example.com",
      "999.1.1.1",
      "1.2.3",
      "_hidden",
    ]) {
      expect(ip({ "x-forwarded-for": junk })).toBeUndefined();
      expect(
        ip({
          "x-forwarded-for": `${junk}, 39.45.12.7`,
          "x-real-ip": "10.0.0.9",
        }),
      ).toBe("10.0.0.9");
    }
    expect(ip({})).toBeUndefined();
    expect(ip({ "x-real-ip": "nope" })).toBeUndefined();
  });
});
