import { describe, expect, it } from "vitest";
import {
  occasionsOf,
  parseDesignFilters,
  selectDesigns,
  type CatalogDesign,
} from "@/features/templates/design-filters";

const d = (
  id: string,
  name: string,
  productId: CatalogDesign["productId"],
  occasions: string[],
  pricePkr: number | null,
  createdAt: string,
): CatalogDesign => ({
  id,
  name,
  productId,
  productName: {
    mug: "Custom Mug",
    "two-tone-mug": "Dual Accent Mug",
    tshirt: "T-shirt",
    hoodie: "Hoodie",
  }[productId],
  occasions: occasionsOf({ occasions }),
  occasionLabels: occasions.length ? occasions : ["Everyday"],
  pricePkr,
  createdAt,
});

const all = [
  d("a", "Markhor – Mug", "mug", ["14-august"], 1000, "2026-10-01"),
  d("b", "Soul – Hoodie", "hoodie", [], 3000, "2026-10-05"),
  d("c", "Eid Mubarak – Mug", "mug", ["eid"], 850, "2026-09-01"),
  d("d", "Today – T-shirt", "tshirt", [], null, "2026-10-09"),
];

describe("design catalog", () => {
  it("counts untagged designs as Everyday", () => {
    expect(occasionsOf({ occasions: [] })).toEqual(["everyday"]);
    expect(
      selectDesigns(all, { occasion: "everyday" }).map((x) => x.id),
    ).toEqual(["d", "b"]);
  });

  it("combines product and occasion filters", () => {
    expect(
      selectDesigns(all, { product: "mug", occasion: "eid" }).map((x) => x.id),
    ).toEqual(["c"]);
    expect(selectDesigns(all, { product: "hoodie", occasion: "eid" })).toEqual(
      [],
    );
  });

  it("searches name, product and occasion; every word must match", () => {
    expect(selectDesigns(all, { q: "markhor" }).map((x) => x.id)).toEqual([
      "a",
    ]);
    expect(selectDesigns(all, { q: "MUG eid" }).map((x) => x.id)).toEqual([
      "c",
    ]);
    expect(selectDesigns(all, { q: "everyday" }).map((x) => x.id)).toEqual([
      "d",
      "b",
    ]);
  });

  it("sorts newest first, or by price (designs without a price last)", () => {
    expect(selectDesigns(all, {}).map((x) => x.id)).toEqual([
      "d",
      "b",
      "a",
      "c",
    ]);
    expect(selectDesigns(all, { sort: "price-asc" }).map((x) => x.id)).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
    expect(selectDesigns(all, { sort: "price-desc" }).map((x) => x.id)).toEqual(
      ["b", "a", "c", "d"],
    );
  });

  it('the "mugs" group matches every mug type but nothing else', () => {
    const withDual = [
      ...all,
      d("e", "Dual – Mug", "two-tone-mug", [], 1500, "2026-10-10"),
    ];
    expect(
      selectDesigns(withDual, { product: "mugs", sort: "price-asc" }).map(
        (x) => x.id,
      ),
    ).toEqual(["c", "a", "e"]);
  });

  it("reads product=mugs (the offer banner link) from the address", () => {
    expect(parseDesignFilters({ product: "mugs" })).toEqual({
      product: "mugs",
    });
    expect(parseDesignFilters({ product: "nonsense" })).toEqual({});
  });
});
