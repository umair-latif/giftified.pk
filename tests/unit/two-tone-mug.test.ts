import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCTS,
  PRODUCT_IDS,
  bodyHex,
  editableProductIds,
  getProduct,
} from "@/config/products";
import { PRODUCT_SKUS, isProductId } from "@/lib/commerce/woo-map";
import { savedDesignSchema } from "@/lib/commerce/saved-designs";
import {
  MOCKUP_SPECS,
  isGarmentSpec,
  specsForColour,
} from "@/features/editor/mockup/specs";

const twoTone = getProduct("two-tone-mug")!;

describe("Two-Tone Mug", () => {
  it("is a mug with the same wrap as the Custom Mug", () => {
    expect(twoTone.kind).toBe("mug");
    expect(twoTone.printArea).toEqual(PRODUCTS.mug!.printArea);
    expect(twoTone.edgeLabels).toEqual({ left: "Handle", right: "Handle" });
  });

  it("is picked by its rim colour but printed on its white body", () => {
    expect(twoTone.baseColors.map((c) => c.id)).toEqual([
      "red",
      "blue",
      "black",
    ]);
    for (const colour of twoTone.baseColors) {
      expect(colour.hex).not.toBe("#ffffff"); // the swatch is the rim
      expect(bodyHex(colour)).toBe("#ffffff"); // the print sits on white
    }
    // A product without `bodyHex` still uses its own colour.
    expect(bodyHex(PRODUCTS.mug!.baseColors[1])).toBe("#1b1b1b");
    expect(bodyHex(undefined)).toBe("#ffffff");
  });

  it("has right, front and left photos for every colour, and they exist", () => {
    for (const colour of twoTone.baseColors) {
      const specs = specsForColour("two-tone-mug", colour.id);
      expect(specs.map((s) => s.id)).toEqual([
        `right-${colour.id}`,
        `front-${colour.id}`,
        `left-${colour.id}`,
      ]);
      for (const spec of specs)
        expect(existsSync(join(process.cwd(), "public", spec.src))).toBe(true);
    }
  });

  it("measures each photo's rim and base, inside the body it belongs to", () => {
    for (const spec of MOCKUP_SPECS["two-tone-mug"] ?? []) {
      expect(isGarmentSpec(spec)).toBe(false);
      if (isGarmentSpec(spec)) continue;
      const { body, outline } = spec;
      expect(outline).toBeDefined();
      for (const edge of [outline!.top, outline!.bottom]) {
        // Left to right, spanning the whole body: the engine reads it by x.
        expect(edge[0]![0]).toBe(body.left);
        expect(edge.at(-1)![0]).toBe(body.right);
        expect(edge.every((p, i) => i === 0 || p[0] > edge[i - 1]![0])).toBe(
          true,
        );
        expect(
          edge.every(([, y]) => y > body.top - 2 && y < body.bottom + 2),
        ).toBe(true);
      }
      // The rim is above the base everywhere.
      expect(Math.max(...outline!.top.map(([, y]) => y))).toBeLessThan(
        Math.min(...outline!.bottom.map(([, y]) => y)),
      );
    }
  });

  it("shows the handle on the side it says, and hides it on the front", () => {
    const byId = new Map(
      (MOCKUP_SPECS["two-tone-mug"] ?? []).map((s) => [s.id, s]),
    );
    for (const colour of ["red", "blue", "black"]) {
      const right = byId.get(`right-${colour}`)!;
      const front = byId.get(`front-${colour}`)!;
      const left = byId.get(`left-${colour}`)!;
      if (isGarmentSpec(right) || isGarmentSpec(front) || isGarmentSpec(left))
        throw new Error("mug specs expected");
      expect(right.side).toBe("right");
      expect(left.side).toBe("left");
      expect(front.geometry.handleAngleDeg).toBe(180);
      // The left photo is the right one flipped, so its body is mirrored.
      expect(left.body.left).toBe(1079 - right.body.right);
      expect(left.body.right).toBe(1079 - right.body.left);
    }
  });
});

describe("the product list is one list", () => {
  it("every product the editor offers is asked for from WooCommerce", () => {
    // A hand-written copy of this list is how the Two-Tone Mug was invisible
    // in the shop after it was added everywhere else (Oct 2026).
    expect([...PRODUCT_SKUS].sort()).toEqual([...PRODUCT_IDS].sort());
    expect([...editableProductIds()].sort()).toEqual([...PRODUCT_IDS].sort());
    for (const id of PRODUCT_IDS) expect(isProductId(id)).toBe(true);
    expect(isProductId("design-abc")).toBe(false);
  });

  it("the schema that takes a product id accepts all of them", () => {
    for (const id of PRODUCT_IDS) {
      expect(savedDesignSchema.shape.productId.safeParse(id).success).toBe(
        true,
      );
    }
  });
});
