import { describe, expect, it } from "vitest";
import { hexDigits, parseHexColour } from "@/lib/colour";

describe("parseHexColour", () => {
  it("accepts 6-digit codes with or without #, any case, trimmed", () => {
    expect(parseHexColour("1D4ED8")).toBe("#1d4ed8");
    expect(parseHexColour("#1d4ed8")).toBe("#1d4ed8");
    expect(parseHexColour("  #AbCdEf ")).toBe("#abcdef");
  });

  it("expands 3-digit short codes", () => {
    expect(parseHexColour("#f0a")).toBe("#ff00aa");
    expect(parseHexColour("ABC")).toBe("#aabbcc");
  });

  it("rejects anything else", () => {
    for (const bad of [
      "",
      "#",
      "12345",
      "1234567",
      "#ggg000",
      "red",
      "rgb(0,0,0)",
      "##123456",
    ]) {
      expect(parseHexColour(bad)).toBeNull();
    }
  });

  it("formats digits for display", () => {
    expect(hexDigits("#1d4ed8")).toBe("1D4ED8");
  });
});
