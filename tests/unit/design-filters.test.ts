import { describe, expect, it } from "vitest";
import {
  designsHref,
  parseDesignFilters,
} from "@/features/templates/design-filters";

describe("/designs filters", () => {
  it("keeps known product and occasion values and drops the rest", () => {
    expect(parseDesignFilters({ product: "mug", occasion: "eid" })).toEqual({
      product: "mug",
      occasion: "eid",
    });
    expect(
      parseDesignFilters({ product: "poster", occasion: "<script>" }),
    ).toEqual({});
    expect(parseDesignFilters({ product: ["hoodie", "mug"] })).toEqual({
      product: "hoodie",
    });
  });

  it("builds shareable links", () => {
    expect(designsHref()).toBe("/designs");
    expect(designsHref({ product: "tshirt" })).toBe("/designs?product=tshirt");
    expect(designsHref({ product: "mug", occasion: "birthday" })).toBe(
      "/designs?product=mug&occasion=birthday",
    );
  });
});
