import { describe, expect, it } from "vitest";
import { maskPkMobile, normalizePkMobile } from "@/lib/phone";

describe("normalizePkMobile", () => {
  it.each([
    "03001234567",
    "3001234567",
    "+92 300 1234567",
    "+923001234567",
    "0092-300-1234567",
    "92 300 1234567",
    "0300-1234567",
    "0300 123 4567",
    "(0300) 1234567",
    "+92 (0)300 1234567",
    "  03001234567  ",
  ])("accepts %s", (input) => {
    expect(normalizePkMobile(input)).toBe("+923001234567");
  });

  it("keeps the operator prefix", () => {
    expect(normalizePkMobile("0345 9876543")).toBe("+923459876543");
  });

  it.each([
    ["empty", ""],
    ["Lahore landline", "042-35761234"],
    ["Karachi landline", "+92 21 34567890"],
    ["too short", "0300123456"],
    ["too long", "030012345678"],
    ["too short without 0", "300123456"],
    ["letters", "0300-abc-4567"],
    ["another country", "+44 7911 123456"],
    ["another country, 11 digits", "+1 300 123 4567"],
    ["plus in the middle", "0300+1234567"],
    ["92 with too few digits", "92300123456"],
  ])("rejects %s", (_label, input) => {
    expect(normalizePkMobile(input)).toBeNull();
  });
});

describe("maskPkMobile", () => {
  it("shows the prefix and last four digits only", () => {
    expect(maskPkMobile("+923001234567")).toBe("+92 300 ***4567");
  });
});
