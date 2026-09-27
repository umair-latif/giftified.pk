import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateOrderInput } from "@/types/order";
import { fakeWoo, wooFixture } from "./commerce-woo-helpers";

vi.mock("server-only", () => ({}));
const { createWooCommerceClient, wooConfigFromEnv, WooCommerceError } =
  await import("@/lib/commerce/woocommerce");

const input: CreateOrderInput = {
  checkoutId: "chk-new",
  customer: {
    fullName: "Ayesha Khan",
    phone: "+923001234567",
    city: "Gujrat",
    addressLine: "House 12, Street 4",
    landmark: "Near GT Road",
  },
  lines: [
    { productId: "mug", colourId: "white", quantity: 2, designId: "d-9" },
  ],
};

let woo: ReturnType<typeof fakeWoo>;
let clock: number;
const client = () =>
  createWooCommerceClient({
    url: "https://shop.test/",
    consumerKey: "ck_test",
    consumerSecret: "cs_test",
    webhookSecret: "whsec",
    fetch: woo.fetch,
    now: () => clock,
  });

beforeEach(() => {
  woo = fakeWoo();
  clock = Date.parse("2026-09-27T12:00:00Z");
});

describe("WooCommerce client — requests", () => {
  it("calls REST v3 with Basic auth and never caches order reads", async () => {
    woo.seedOrder(wooFixture("order"));
    await client().getOrder(5123);
    const call = woo.calls.find((c) => c.path === "/orders/5123")!;
    const headers = call.init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("ck_test:cs_test").toString("base64")}`,
    );
    expect(call.init!.cache).toBe("no-store");
    const catalogCall = woo.calls.find((c) => c.path === "/products")!;
    expect(catalogCall.init).toMatchObject({ next: { revalidate: 300 } });
  });

  it("returns null for a missing order and throws typed errors otherwise", async () => {
    await expect(client().getOrder(1)).resolves.toBeNull();
    await expect(
      client().setOrderStatus(1, "processing"),
    ).rejects.toBeInstanceOf(WooCommerceError);
  });

  it("lists only our products", async () => {
    const list = await client().listProducts();
    expect(list.map((p) => p.productId)).toEqual(["mug"]);
    expect(await client().getProduct("hoodie")).toBeNull();
  });
});

describe("WooCommerce client — createOrder", () => {
  it("creates an on-hold COD order priced by WooCommerce, not the client", async () => {
    const order = await client().createOrder(input);
    const post = woo.calls.find(
      (c) => c.method === "POST" && c.path === "/orders",
    )!;
    const body = post.body as Record<string, unknown>;

    expect(body).toMatchObject({
      payment_method: "cod",
      set_paid: false,
      status: "on-hold",
      billing: {
        first_name: "Ayesha",
        last_name: "Khan",
        address_1: "House 12, Street 4",
        address_2: "Near GT Road",
        city: "Gujrat",
        country: "PK",
        phone: "+923001234567",
      },
      line_items: [
        {
          product_id: 101,
          variation_id: 1011,
          quantity: 2,
          meta_data: [{ key: "_design_id", value: "d-9" }],
        },
      ],
      shipping_lines: [{ method_id: "flat_rate", total: "150" }],
      meta_data: [{ key: "_checkout_id", value: "chk-new" }],
    });
    // No price fields go to WC — it prices lines from the product itself.
    const line = (body.line_items as Record<string, unknown>[])[0]!;
    expect(line).not.toHaveProperty("price");
    expect(line).not.toHaveProperty("total");
    expect(line).not.toHaveProperty("subtotal");

    expect(order.status).toBe("on-hold");
    expect(order.lines[0]?.unitPricePkr).toBe(1499);
    expect(order.shippingPkr).toBe(150);
  });

  it("is idempotent on checkoutId: finds the earlier order instead of creating", async () => {
    woo.seedOrder(wooFixture("order")); // carries _checkout_id "chk-1"
    const order = await client().createOrder({ ...input, checkoutId: "chk-1" });
    expect(order.id).toBe(5123);
    expect(
      woo.calls.some((c) => c.method === "POST" && c.path === "/orders"),
    ).toBe(false);
    const scan = woo.calls.find(
      (c) => c.method === "GET" && c.path === "/orders",
    )!;
    expect(scan.query.get("after")).toBe("2026-09-25T12:00:00");
    expect(scan.query.get("dates_are_gmt")).toBe("true");
  });

  it("collapses a double-tap into one WC order", async () => {
    const c = client();
    const [a, b] = await Promise.all([
      c.createOrder(input),
      c.createOrder(input),
    ]);
    expect(a.id).toBe(b.id);
    expect(
      woo.calls.filter((x) => x.method === "POST" && x.path === "/orders"),
    ).toHaveLength(1);
    const again = await c.createOrder(input);
    expect(again.id).toBe(a.id);
  });

  it("rejects unknown colours and unavailable variants", async () => {
    await expect(
      client().createOrder({
        ...input,
        lines: [{ ...input.lines[0]!, colourId: "red" }],
      }),
    ).rejects.toThrow(/Unknown product/);
    await expect(
      client().createOrder({
        ...input,
        lines: [{ ...input.lines[0]!, colourId: "black" }],
      }),
    ).rejects.toThrow(/unavailable/);
    await expect(
      client().createOrder({
        ...input,
        lines: [{ ...input.lines[0]!, quantity: 0 }],
      }),
    ).rejects.toThrow(/quantity/);
  });
});

describe("WooCommerce client — shipping", () => {
  it("quotes by city and caches zones for 10 minutes", async () => {
    const c = client();
    expect(await c.quoteShipping("Lahore")).toEqual({
      city: "Lahore",
      shippingPkr: 200,
    });
    expect(await c.quoteShipping("Multan")).toEqual({
      city: "Multan",
      shippingPkr: 300,
    });
    const zoneCalls = () =>
      woo.calls.filter((x) => x.path === "/shipping/zones").length;
    expect(zoneCalls()).toBe(1);
    clock += 10 * 60 * 1000 + 1;
    await c.quoteShipping("Lahore");
    expect(zoneCalls()).toBe(2);
  });
});

describe("WooCommerce client — pipeline writes", () => {
  it("sets line files as line-item meta and adds private notes", async () => {
    woo.seedOrder(wooFixture("order"));
    const c = client();
    await c.setLineFiles(5123, 0, { printPngUrl: "https://files.test/p.png" });
    await c.addOrderNote(5123, "Print file rendered");
    const put = woo.calls.find((x) => x.method === "PUT")!;
    expect(put.body).toEqual({
      line_items: [
        {
          id: 77,
          meta_data: [
            { key: "_print_png_url", value: "https://files.test/p.png" },
          ],
        },
      ],
    });
    const note = woo.calls.find((x) => x.path === "/orders/5123/notes")!;
    expect(note.body).toEqual({
      note: "Print file rendered",
      customer_note: false,
    });
    const order = await c.getOrder(5123);
    expect(order?.lines[0]?.printPngUrl).toBe("https://files.test/p.png");
    await expect(c.setLineFiles(5123, 3, { printPngUrl: "x" })).rejects.toThrow(
      /no line 3/,
    );
  });
});

describe("wooConfigFromEnv", () => {
  const env = {
    WC_URL: "https://shop.example.pk",
    WC_CONSUMER_KEY: "ck",
    WC_CONSUMER_SECRET: "cs",
    WC_WEBHOOK_SECRET: "wh",
  };
  it("reads the four WC variables", () => {
    expect(wooConfigFromEnv(env)).toMatchObject({
      url: env.WC_URL,
      consumerKey: "ck",
    });
  });
  it("refuses plain http and missing secrets", () => {
    expect(() =>
      wooConfigFromEnv({ ...env, WC_URL: "http://shop.example.pk" }),
    ).toThrow(/WC_URL/);
    expect(() => wooConfigFromEnv({ ...env, WC_WEBHOOK_SECRET: "" })).toThrow(
      /WC_WEBHOOK_SECRET/,
    );
  });
});
