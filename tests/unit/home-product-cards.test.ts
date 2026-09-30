import { describe, expect, it } from "vitest";
import { getProduct } from "@/config/products";
import {
  buildHomeProductCards,
  fromPrice,
  HOME_PRODUCTS,
} from "@/features/home/product-cards";
import type { CatalogProduct } from "@/lib/commerce/types";
import { createMockCommerce } from "@/lib/commerce/mock";

const hasConfig = (id: string) => getProduct(id) !== null;

const product = (over: Partial<CatalogProduct> = {}): CatalogProduct => ({
  productId: "mug",
  wooProductId: 1,
  slug: "custom-mug",
  name: "Mug",
  images: [],
  basePricePkr: 1999,
  variants: [],
  ...over,
});

describe("home product cards", () => {
  it("links the mug with its store price; t-shirt and hoodie are coming soon", async () => {
    const catalog = await createMockCommerce().listProducts();
    const cards = buildHomeProductCards(catalog, hasConfig);
    expect(cards.map((c) => c.productId)).toEqual(["mug", "tshirt", "hoodie"]);
    const [mug, tshirt, hoodie] = cards;
    expect(mug).toMatchObject({ href: "/products/mug", fromPricePkr: 1499 });
    expect(tshirt).toMatchObject({ href: null, fromPricePkr: null });
    expect(hoodie?.href).toBeNull();
  });

  it("uses the catalog slug, and the product ID when the store has no entry", () => {
    const withSlug = buildHomeProductCards([product()], hasConfig);
    expect(withSlug[0]?.href).toBe("/products/custom-mug");
    const noStore = buildHomeProductCards([], hasConfig);
    expect(noStore[0]).toMatchObject({
      href: "/products/mug",
      fromPricePkr: null,
      fromRegularPricePkr: null,
    });
  });

  it("gates clickability on the print config, not on the catalog", () => {
    const cards = buildHomeProductCards(
      [product({ productId: "tshirt", slug: "tshirt" })],
      (id) => id === "tshirt",
    );
    expect(cards.find((c) => c.productId === "tshirt")?.href).toBe(
      "/products/tshirt",
    );
    expect(cards.find((c) => c.productId === "mug")?.href).toBeNull();
  });

  it("'from' price is the cheapest variant, else the base price", () => {
    const v = (pricePkr: number) => ({
      colourId: "white",
      wooVariationId: pricePkr,
      pricePkr,
      inStock: true,
    });
    expect(fromPrice(product({ variants: [v(1799), v(1499), v(1650)] }))).toBe(
      1499,
    );
    expect(fromPrice(product())).toBe(1999);
  });

  it("every card has a WebP image under public/home", () => {
    for (const p of HOME_PRODUCTS)
      expect(p.image).toMatch(/^\/home\/.+\.webp$/);
  });
});
