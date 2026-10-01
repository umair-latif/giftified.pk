import { describe, expect, it } from "vitest";
import { getProduct } from "@/config/products";
import {
  buildCatalogCards,
  jsonLdScript,
  productJsonLd,
  resolveSlug,
  sizes,
  swatches,
} from "@/features/catalog/catalog-model";
import type { CatalogProduct } from "@/lib/commerce/types";

const mug: CatalogProduct = {
  productId: "mug",
  wooProductId: 101,
  slug: "custom-mug",
  name: "Custom Mug",
  images: [
    { src: "https://shop.test/wp-content/uploads/mug.webp", alt: "Mug" },
  ],
  shortDescription: "11oz mug",
  basePricePkr: 1499,
  variants: [
    {
      colourId: "white",
      colourName: "Gloss White",
      colourHex: "#ffffff",
      wooVariationId: 1,
      pricePkr: 1699,
      inStock: true,
    },
    {
      colourId: "black",
      colourName: "Black",
      colourHex: "#111111",
      wooVariationId: 2,
      pricePkr: 1499,
      inStock: false,
    },
    { colourId: "white", wooVariationId: 3, pricePkr: 1899, inStock: true },
  ],
};
const tee: CatalogProduct = {
  ...mug,
  productId: "tshirt",
  slug: "t-shirt",
  name: "T-Shirt",
  variants: [
    {
      colourId: "black",
      wooVariationId: 4,
      size: "M",
      pricePkr: 1999,
      inStock: true,
    },
    {
      colourId: "black",
      wooVariationId: 5,
      size: "L",
      pricePkr: 1999,
      inStock: true,
    },
  ],
};
const hasConfig = (id: string) => getProduct(id) !== null;

describe("catalog cards", () => {
  it("lists mug, tee and hoodie; only products with a print config link anywhere", () => {
    const cards = buildCatalogCards([mug, tee], getProduct);
    expect(cards.map((c) => [c.productId, c.href])).toEqual([
      ["mug", "/products/custom-mug"],
      ["tshirt", "/products/t-shirt"],
      ["hoodie", null],
    ]);
  });

  it("shows the lowest variant price, the first image and one swatch per colour", () => {
    const [card] = buildCatalogCards([mug], getProduct);
    expect(card).toMatchObject({
      name: "Custom Mug",
      fromPricePkr: 1499,
      fromRegularPricePkr: null,
      image: {
        src: "https://shop.test/wp-content/uploads/mug.webp",
        alt: "Mug",
      },
      swatches: [
        { name: "Gloss White", hex: "#ffffff" },
        { name: "Black", hex: "#111111" },
      ],
    });
  });

  it("still shows products when the store is down: config colours, no price, product-id link", () => {
    const [card, teeCard] = buildCatalogCards([], getProduct);
    expect(card).toMatchObject({
      href: "/products/mug",
      fromPricePkr: null,
      fromRegularPricePkr: null,
      image: null,
      swatches: [{ name: "Gloss White", hex: "#ffffff" }],
    });
    expect(teeCard).toMatchObject({
      name: "T-Shirt",
      href: "/products/tshirt",
      swatches: getProduct("tshirt")!.baseColors.map(({ name, hex }) => ({
        name,
        hex,
      })),
    });
  });

  it("falls back to config colours for swatches WooCommerce doesn't describe", () => {
    const bare = {
      ...mug,
      variants: [
        { colourId: "white", wooVariationId: 9, pricePkr: 1, inStock: true },
      ],
    };
    expect(swatches(bare, getProduct("mug")!.baseColors)).toEqual([
      { name: "Gloss White", hex: "#ffffff" },
    ]);
    expect(
      swatches({
        ...bare,
        variants: [{ ...bare.variants[0]!, colourId: "teal" }],
      }),
    ).toEqual([{ name: "teal", hex: null }]);
  });

  it("lists distinct sizes in order", () => {
    expect(sizes(tee)).toEqual(["M", "L"]);
    expect(sizes(mug)).toEqual([]);
  });
});

describe("resolveSlug", () => {
  it("finds a product by its WooCommerce slug", () => {
    expect(resolveSlug("custom-mug", [mug], hasConfig)).toMatchObject({
      kind: "found",
      productId: "mug",
    });
  });
  it("redirects the product id to the canonical slug", () => {
    expect(resolveSlug("mug", [mug], hasConfig)).toEqual({
      kind: "redirect",
      to: "/products/custom-mug",
    });
  });
  it("serves the product id directly when the store is down", () => {
    expect(resolveSlug("mug", [], hasConfig)).toEqual({
      kind: "found",
      productId: "mug",
      product: undefined,
    });
  });
  it("has no page for products without a print config, or unknown slugs", () => {
    expect(resolveSlug("hoodie", [], hasConfig)).toEqual({ kind: "none" });
    expect(resolveSlug("tshirt", [], hasConfig)).toEqual({
      kind: "found",
      productId: "tshirt",
      product: undefined,
    });
    expect(resolveSlug("nope", [mug], hasConfig)).toEqual({ kind: "none" });
  });
});

describe("structured data", () => {
  it("is a schema.org Product with a PKR Offer", () => {
    expect(
      productJsonLd(mug, "https://giftified.pk/products/custom-mug"),
    ).toMatchObject({
      "@type": "Product",
      name: "Custom Mug",
      image: ["https://shop.test/wp-content/uploads/mug.webp"],
      offers: {
        "@type": "Offer",
        price: 1499,
        priceCurrency: "PKR",
        availability: "https://schema.org/InStock",
      },
    });
  });
  it("can't break out of its <script> tag", () => {
    const s = jsonLdScript({ name: "</script><script>alert(1)</script>" });
    expect(s).not.toContain("</script>");
    expect(JSON.parse(s)).toEqual({
      name: "</script><script>alert(1)</script>",
    });
  });
});
