import { describe, expect, it } from "vitest";
import { shopProductErrorMessage } from "@/server/templates/shop-error";

describe("shopProductErrorMessage", () => {
  it("explains a duplicate SKU (a product left in the bin)", () => {
    const m = shopProductErrorMessage({
      message:
        "WooCommerce POST /products failed (400): Ungültige oder doppelte Artikelnummer.",
      code: "product_invalid_sku",
    });
    expect(m).toMatch(/in the bin/);
    expect(m).toMatch(/Shop said: Ungültige oder doppelte Artikelnummer\./);
  });

  it("passes WooCommerce's own reason through otherwise", () => {
    const m = shopProductErrorMessage({
      message:
        "WooCommerce POST /products/categories failed (400): A term with the name provided already exists.",
      code: "term_exists",
    });
    expect(m).toMatch(/^The shop couldn't create the product\./);
    expect(m).toMatch(
      /Shop said: A term with the name provided already exists\./,
    );
  });

  it("still reads well without a reason", () => {
    expect(
      shopProductErrorMessage({
        message: "WooCommerce POST /products failed (500)",
      }),
    ).toBe(
      "The shop couldn't create the product. Nothing was saved; please try again.",
    );
  });
});
