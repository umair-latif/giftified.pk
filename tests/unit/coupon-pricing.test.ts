import { describe, expect, it, vi } from "vitest";
import { createMockCommerce } from "@/lib/commerce/mock";

vi.mock("server-only", () => ({}));
const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
}));

const { priceCart } = await import("@/server/checkout/pricing");
const { placeOrder } = await import("@/features/checkout/actions");
const { getCommerce } = await import("@/lib/commerce");
const { getStorage } = await import("@/lib/storage");
const { designKey } = await import("@/lib/storage/keys");

const mug = { productId: "mug" as const, colourId: "white", quantity: 2 };

async function withDesignProduct(commerce = createMockCommerce()) {
  const made = await commerce.createDesignProduct({
    templateId: "t1",
    baseProductId: "mug",
    name: "Happy Birthday",
    description: "Hi",
    pricePkr: 2000,
    categories: ["Ready-made Custom Mug", "Eid"],
  });
  await commerce.publishDesignProduct(made.wooProductId, {});
  return { commerce, wooProductId: made.wooProductId };
}

describe("priceCart with coupons", () => {
  it("prices the lines from the store and takes the coupon off", async () => {
    const commerce = createMockCommerce();
    const plain = await priceCart(commerce, { lines: [mug], city: "Lahore" });
    const off = await priceCart(commerce, {
      lines: [mug],
      city: "Lahore",
      couponCode: " WELCOME10 ",
    });
    expect(off.couponCode).toBe("welcome10");
    expect(off.discountPkr).toBe(Math.round(plain.subtotalPkr * 0.1));
    expect(off.totalPkr).toBe(plain.totalPkr - off.discountPkr);
    expect(plain.discountPkr).toBe(0);
  });

  it("explains a refused coupon and charges full price", async () => {
    const commerce = createMockCommerce();
    commerce.addCoupon({ code: "old", expiresAt: "2020-01-01T00:00:00Z" });
    commerce.addCoupon({ code: "big", minSubtotalPkr: 1_000_000 });
    for (const [code, msg] of [
      ["nope", /don’t recognise/],
      ["old", /expired/],
      ["big", /Spend Rs 1,000,000/],
    ] as const) {
      const r = await priceCart(commerce, {
        lines: [mug],
        city: "Lahore",
        couponCode: code,
      });
      expect(r.couponCode).toBeUndefined();
      expect(r.couponError).toMatch(msg);
      expect(r.discountPkr).toBe(0);
    }
  });

  it("free shipping zeroes delivery once a city is known", async () => {
    const commerce = createMockCommerce();
    commerce.addCoupon({ code: "ship", amount: 0, freeShipping: true });
    const r = await priceCart(commerce, {
      lines: [mug],
      city: "Lahore",
      couponCode: "ship",
    });
    expect(r.shippingPkr).toBe(0);
    const noCity = await priceCart(commerce, {
      lines: [mug],
      city: "",
      couponCode: "ship",
    });
    expect(noCity.shippingPkr).toBeNull();
  });

  it("a coupon restricted to one design product (or its category) leaves plain products alone", async () => {
    const { commerce, wooProductId } = await withDesignProduct();
    const lines = [mug, { ...mug, quantity: 1, templateId: "t1" }];
    commerce.addCoupon({ code: "one", productIds: [wooProductId], amount: 50 });
    const one = await priceCart(commerce, {
      lines,
      city: "Lahore",
      couponCode: "one",
    });
    expect(one.discountPkr).toBe(1000); // 50% of the 2000 design, nothing off the plain mugs
    commerce.addCoupon({
      code: "eid",
      categoryIds: [commerce.categoryIdFor("Eid")],
      amount: 10,
    });
    const eid = await priceCart(commerce, {
      lines,
      city: "Lahore",
      couponCode: "eid",
    });
    expect(eid.discountPkr).toBe(200);
  });
});

describe("placeOrder with a coupon", () => {
  const input = (checkoutId: string, couponCode?: string) => ({
    checkoutId,
    lines: [
      {
        productId: "mug",
        colourId: "white",
        quantity: 2,
        designId: "couponDes1",
      },
    ],
    fullName: "Ayesha Khan",
    phone: "0300 1234567",
    city: "Lahore",
    addressLine: "House 12, Street 4, Model Town",
    contentConfirmed: true,
    ...(couponCode ? { couponCode } : {}),
  });

  it("re-checks the code: a bad one stops the order with a clear message", async () => {
    await getStorage().put(designKey("couponDes1"), "{}");
    const r = await placeOrder(input("chk-coupon-001", "nope"));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.message).toMatch(/don’t recognise.*Remove it/);
  });

  it("a good code lands on the order as a discount and a lower total", async () => {
    await getStorage().put(designKey("couponDes1"), "{}");
    const r = await placeOrder(input("chk-coupon-002", "WELCOME10"));
    if (!r.ok) throw new Error(JSON.stringify(r));
    const order = await getCommerce().getOrder(r.orderId);
    expect(order?.discountPkr).toBeGreaterThan(0);
    const undiscounted =
      order!.lines.reduce((s, l) => s + l.unitPricePkr * l.quantity, 0) +
      order!.shippingPkr;
    expect(order!.totalPkr).toBe(undiscounted - order!.discountPkr!);
  });
});
