import { describe, expect, it } from "vitest";
import { sizeOptionsFor } from "@/features/editor/components/size-picker";

const variants = [
  { colourId: "white", size: "S", inStock: true },
  { colourId: "white", size: "M", inStock: true },
  { colourId: "black", size: "S", inStock: true },
  { colourId: "black", size: "M", inStock: false },
  { colourId: "black", size: "S", inStock: true },
];

describe("sizeOptionsFor", () => {
  it("lists each size once, for the chosen colour, with stock", () => {
    expect(sizeOptionsFor(variants, "black")).toEqual([
      { size: "S", inStock: true },
      { size: "M", inStock: false },
    ]);
    expect(sizeOptionsFor(variants, "white")).toHaveLength(2);
  });
  it("is empty for products without sizes (mug)", () => {
    expect(
      sizeOptionsFor([{ colourId: "white", inStock: true }], "white"),
    ).toEqual([]);
  });
});
