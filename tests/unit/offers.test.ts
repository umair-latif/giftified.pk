import { afterEach, describe, expect, it, vi } from "vitest";
import { OFFER } from "@/config/site";
import { createMockCommerce } from "@/lib/commerce/mock";
import {
  launchOfferDiscountPkr,
  mugOfferDiscountPkr,
  OFFER_COUPON_MESSAGE,
  OFFER_NAME,
} from "@/lib/offers";
import { buildOrderBody, mapOrder, mapProduct } from "@/lib/commerce/woo-map";
import {
  wooOrderSchema,
  wooProductSchema,
  wooVariationSchema,
} from "@/lib/commerce/woo-schemas";
import type { CreateOrderInput } from "@/types/order";
import { wooFixture } from "./commerce-woo-helpers";

vi.mock("server-only", () => ({}));
const { priceCart } = await import("@/server/checkout/pricing");

const saved = { ...OFFER };
afterEach(() => Object.assign(OFFER, saved));

const line = (productId: string, unitPricePkr: number, quantity = 1) => ({
  productId,
  unitPricePkr,
  quantity,
});

describe("mugOfferDiscountPkr (the rule)", () => {
  it("is nothing for one mug", () => {
    expect(mugOfferDiscountPkr([line("mug", 1500)])).toBe(0);
    expect(mugOfferDiscountPkr([])).toBe(0);
  });

  it("makes the cheaper of two mugs free, Custom and Dual Accent together", () => {
    expect(mugOfferDiscountPkr([line("mug", 2000), line("mug", 1500)])).toBe(
      1500,
    );
    expect(
      mugOfferDiscountPkr([line("two-tone-mug", 2000), line("mug", 1500)]),
    ).toBe(1500);
  });

  it("counts a quantity of 2 on one line as two mugs", () => {
    expect(mugOfferDiscountPkr([line("mug", 1500, 2)])).toBe(1500);
  });

  it("is one free mug per order, however many mugs", () => {
    expect(
      mugOfferDiscountPkr([
        line("mug", 1500, 3),
        line("two-tone-mug", 2000, 2),
      ]),
    ).toBe(1500);
  });

  it("only looks at mugs: a cheaper T-shirt is not the free item, one mug is no offer", () => {
    expect(mugOfferDiscountPkr([line("mug", 1500), line("tshirt", 800)])).toBe(
      0,
    );
    expect(
      mugOfferDiscountPkr([
        line("mug", 2000),
        line("mug", 1500),
        line("tshirt", 800),
        line("hoodie", 500),
      ]),
    ).toBe(1500);
  });
});

describe("the offer switch", () => {
  it("is off by default, so no discount", () => {
    expect(launchOfferDiscountPkr([line("mug", 1500, 2)])).toBe(0);
  });

  it("applies while on", () => {
    OFFER.enabled = true;
    expect(launchOfferDiscountPkr([line("mug", 1500, 2)])).toBe(1500);
  });
});

describe("priceCart with the launch offer", () => {
  const white = { productId: "mug" as const, colourId: "white", quantity: 1 };
  const black = { productId: "mug" as const, colourId: "black", quantity: 1 };
  const tee = {
    productId: "tshirt" as const,
    colourId: "white",
    size: "M",
    quantity: 1,
  };

  it("takes the cheaper mug off, delivery untouched", async () => {
    OFFER.enabled = true;
    const commerce = createMockCommerce();
    const r = await priceCart(commerce, {
      lines: [white, black],
      city: "Lahore",
    });
    // Mock prices: white mug 1,499, black mug 1,000.
    expect(r.offerDiscountPkr).toBe(1000);
    expect(r.subtotalPkr).toBe(2499);
    expect(r.totalPkr).toBe(2499 - 1000 + (r.shippingPkr ?? 0));
  });

  it("two mugs and a T-shirt: the offer is on the mug", async () => {
    OFFER.enabled = true;
    const r = await priceCart(createMockCommerce(), {
      lines: [white, black, tee],
      city: "Lahore",
    });
    expect(r.offerDiscountPkr).toBe(1000);
  });

  it("nothing for one mug, or when the offer is off", async () => {
    const commerce = createMockCommerce();
    OFFER.enabled = true;
    expect(
      (await priceCart(commerce, { lines: [white], city: "Lahore" }))
        .offerDiscountPkr,
    ).toBe(0);
    OFFER.enabled = false;
    expect(
      (await priceCart(commerce, { lines: [white, black], city: "Lahore" }))
        .offerDiscountPkr,
    ).toBe(0);
  });

  it("refuses a coupon while the offer applies, and still gives the offer", async () => {
    OFFER.enabled = true;
    const commerce = createMockCommerce();
    commerce.addCoupon({ code: "extra" });
    const r = await priceCart(commerce, {
      lines: [white, black],
      city: "Lahore",
      couponCode: "extra",
    });
    expect(r.couponError).toBe(OFFER_COUPON_MESSAGE);
    expect(r.couponCode).toBeUndefined();
    expect(r.discountPkr).toBe(0);
    expect(r.offerDiscountPkr).toBe(1000);
  });

  it("a coupon still works when the offer does not apply (one mug)", async () => {
    OFFER.enabled = true;
    const commerce = createMockCommerce();
    commerce.addCoupon({ code: "extra" });
    const r = await priceCart(commerce, {
      lines: [white],
      city: "Lahore",
      couponCode: "extra",
    });
    expect(r.couponCode).toBe("extra");
    expect(r.couponError).toBeUndefined();
  });
});

describe("the order in WooCommerce", () => {
  const input: CreateOrderInput = {
    checkoutId: "chk-offer",
    customer: {
      fullName: "Ayesha Khan",
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12, Street 4",
    },
    lines: [],
  };
  const lines = [
    {
      productId: "mug",
      unitPricePkr: 1500,
      wooProductId: 101,
      wooVariationId: 1011,
      quantity: 1,
      designId: "a",
    },
    {
      productId: "two-tone-mug",
      unitPricePkr: 2000,
      wooProductId: 102,
      wooVariationId: 1021,
      quantity: 1,
      designId: "b",
    },
  ];

  it("adds a negative fee line for the cheaper mug", () => {
    OFFER.enabled = true;
    const body = buildOrderBody(input, lines, 250);
    expect(body.fee_lines).toEqual([
      { name: OFFER_NAME, tax_status: "none", total: "-1500" },
    ]);
  });

  it("adds nothing while the offer is off", () => {
    expect(buildOrderBody(input, lines, 250)).not.toHaveProperty("fee_lines");
  });

  it("never combines with a coupon", () => {
    OFFER.enabled = true;
    expect(() =>
      buildOrderBody({ ...input, couponCode: "extra" }, lines, 250),
    ).toThrow(OFFER_COUPON_MESSAGE);
  });

  it("reads the fee line back as the order's discount, next to any coupon discount", () => {
    const products = wooProductSchema.array().parse(wooFixture("products"));
    const variations = wooVariationSchema
      .array()
      .parse(wooFixture("variations-mug"));
    const catalog = [
      mapProduct(
        products.find((p) => p.sku === "mug")!,
        variations,
      )!,
    ];
    const fixture = wooFixture<Record<string, unknown>>("order");
    const order = mapOrder(
      wooOrderSchema.parse({
        ...fixture,
        discount_total: "0",
        fee_lines: [{ name: OFFER_NAME, total: "-1500" }],
      }),
      catalog,
    );
    expect(order.discountPkr).toBe(1500);
    const other = mapOrder(
      wooOrderSchema.parse({
        ...fixture,
        discount_total: "0",
        fee_lines: [{ name: "Some other fee", total: "-99" }],
      }),
      catalog,
    );
    expect(other.discountPkr).toBeUndefined();
  });
});
