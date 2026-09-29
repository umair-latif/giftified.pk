import { describe, expect, it } from "vitest";
import { cartCount, parseCart } from "@/features/cart/cart-storage";
import { createMockCommerce } from "@/lib/commerce/mock";
import { buildOrderBody, mapOrder, mapProduct } from "@/lib/commerce/woo-map";
import { wooOrderSchema } from "@/lib/commerce/woo-schemas";
import {
  orderStatusUrl,
  orderToken,
  verifyOrderToken,
} from "@/server/orders/order-link";
import order from "../fixtures/woo/order.json";

const env = { FILES_LINK_SECRET: "test-secret", NODE_ENV: "production" };

describe("order links", () => {
  it("verifies only the right order + phone + token", () => {
    const t = orderToken(5123, "+923001234567", env);
    expect(t).toMatch(/^[\w-]{22}$/);
    expect(verifyOrderToken(5123, "+923001234567", t, env)).toBe(true);
    expect(verifyOrderToken(5124, "+923001234567", t, env)).toBe(false);
    expect(verifyOrderToken(5123, "+923001234568", t, env)).toBe(false);
    expect(verifyOrderToken(5123, "+923001234567", undefined, env)).toBe(false);
    expect(verifyOrderToken(5123, "+923001234567", t + "x", env)).toBe(false);
  });

  it("builds the status URL", () => {
    expect(
      orderStatusUrl({ id: 7, customer: { phone: "+923001234567" } }, env),
    ).toMatch(/^\/order\/7\?t=[\w-]{22}$/);
  });

  it("refuses to sign in production without a secret, but works for demo builds", () => {
    expect(() =>
      orderToken(1, "+923001234567", { NODE_ENV: "production" }),
    ).toThrow(/secret/);
    expect(
      orderToken(1, "+923001234567", {
        NODE_ENV: "production",
        COMMERCE_MOCK: "1",
      }),
    ).toBeTruthy();
  });
});

describe("cart storage", () => {
  const item = {
    id: "a1",
    productId: "mug",
    colourId: "white",
    quantity: 2,
    designKey: "d1",
    addedAt: "2026-09-28T10:00:00.000Z",
  };

  it("keeps valid lines and drops broken ones", () => {
    const items = parseCart(
      JSON.stringify([item, { ...item, quantity: 0 }, { nope: 1 }, "x"]),
    );
    expect(items).toEqual([item]);
    expect(cartCount(items)).toBe(2);
  });

  it("survives garbage", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("{not json")).toEqual([]);
    expect(parseCart('{"a":1}')).toEqual([]);
  });
});

describe("commerce contract additions", () => {
  it("mock: tracking lookup needs the matching phone", async () => {
    const c = createMockCommerce();
    const o = await c.createOrder({
      checkoutId: "chk-track-1",
      email: "a@b.pk",
      customer: {
        fullName: "Ayesha Khan",
        phone: "+923001234567",
        city: "Lahore",
        addressLine: "House 12, Street 4",
      },
      lines: [
        { productId: "mug", colourId: "white", quantity: 1, designId: "d1" },
      ],
    });
    expect(o.email).toBe("a@b.pk");
    expect((await c.findOrderForTracking(o.id, "+923001234567"))?.id).toBe(
      o.id,
    );
    expect(await c.findOrderForTracking(o.id, "+923009999999")).toBeNull();
    expect(await c.findOrderForTracking(99999, "+923001234567")).toBeNull();
  });

  it("maps courier/tracking meta and billing email from WooCommerce", () => {
    const product = mapProduct(
      {
        id: 101,
        name: "Custom Mug",
        slug: "custom-mug",
        sku: "mug",
        type: "simple",
        status: "publish",
        price: "1499",
        stock_status: "instock",
        variations: [],
        images: [],
      },
      [],
    )!;
    const raw = order as {
      meta_data: unknown[];
      billing: object;
      line_items: { product_id: number; variation_id: number }[];
    };
    const o = mapOrder(
      wooOrderSchema.parse({
        ...raw,
        billing: { ...raw.billing, email: " Ayesha@Example.PK " },
        line_items: raw.line_items.map((li) => ({
          ...li,
          product_id: 101,
          variation_id: 0,
        })),
        meta_data: [
          ...raw.meta_data,
          { key: "_courier", value: "TCS" },
          { key: "_tracking_number", value: "771234" },
          { key: "_tracking_url", value: "javascript:alert(1)" },
        ],
      }),
      [product],
    );
    expect(o.email).toBe("ayesha@example.pk");
    // Only https tracking links are shown.
    expect(o.tracking).toEqual({ courier: "TCS", number: "771234" });
  });

  it("sends email and customer_id to WooCommerce when given", () => {
    const body = buildOrderBody(
      {
        checkoutId: "c",
        email: "a@b.pk",
        customerId: 42,
        customerIp: "39.45.12.7",
        customer: {
          fullName: "A B",
          phone: "+923001234567",
          city: "Lahore",
          addressLine: "x",
        },
        lines: [],
      },
      [],
      200,
    );
    expect(body.billing).toMatchObject({ email: "a@b.pk" });
    expect(body).toMatchObject({
      customer_id: 42,
      customer_ip_address: "39.45.12.7",
    });
    const junk = buildOrderBody(
      {
        checkoutId: "c",
        customerIp: "1.2.3.4, <script>",
        customer: {
          fullName: "A B",
          phone: "+923001234567",
          city: "Lahore",
          addressLine: "x",
        },
        lines: [],
      },
      [],
      200,
    );
    expect(junk).not.toHaveProperty("customer_ip_address");
  });
});
