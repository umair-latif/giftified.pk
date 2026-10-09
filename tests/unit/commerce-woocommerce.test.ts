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
    expect(catalogCall.init).toMatchObject({
      next: { revalidate: 3600, tags: ["catalog"] },
    });
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

  it("treats a WordPress crash after saving the order as success (plugin email failure)", async () => {
    const real = woo.fetch;
    const crashing: typeof fetch = async (u, init) => {
      const res = await real(u, init);
      const url = new URL(String(u));
      if (
        (init?.method ?? "GET") === "POST" &&
        url.pathname.endsWith("/orders")
      )
        return new Response(
          JSON.stringify({
            code: "internal_server_error",
            message: "kritischer Fehler",
          }),
          { status: 500 },
        );
      return res;
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = createWooCommerceClient({
      url: "https://shop.test/",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec",
      fetch: crashing,
      now: () => clock,
    });
    const order = await c.createOrder({ ...input, checkoutId: "chk-crash" });
    expect(order.status).toBe("on-hold");
    expect(
      woo.calls.filter((x) => x.method === "POST" && x.path === "/orders"),
    ).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("saved order"));
    warn.mockRestore();
  });

  it("still fails when WordPress crashed before saving", async () => {
    const real = woo.fetch;
    const crashing: typeof fetch = async (u, init) => {
      const url = new URL(String(u));
      if (
        (init?.method ?? "GET") === "POST" &&
        url.pathname.endsWith("/orders")
      )
        return new Response("{}", { status: 500 });
      return real(u, init);
    };
    const c = createWooCommerceClient({
      url: "https://shop.test/",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec",
      fetch: crashing,
      now: () => clock,
    });
    await expect(
      c.createOrder({ ...input, checkoutId: "chk-crash-2" }),
    ).rejects.toBeInstanceOf(WooCommerceError);
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

describe("WooCommerce client — retention (task 24)", () => {
  const order = (over: Record<string, unknown>) => ({
    ...wooFixture<Record<string, unknown>>("order"),
    ...over,
  });

  it("reads every order, oldest id first, with slim fields, and maps the retention view", async () => {
    woo.seedOrder(
      order({
        id: 1,
        status: "completed",
        customer_id: 0,
        date_modified_gmt: "2026-08-02T10:00:00",
        date_completed_gmt: "2026-08-01T10:00:00",
        meta_data: [{ id: 1, key: "_retain_for_review", value: "Yes " }],
      }),
    );
    woo.seedOrder(
      order({
        id: 2,
        status: "cancelled",
        customer_id: 7,
        date_modified_gmt: "2026-08-03T10:00:00",
        date_completed_gmt: null,
        meta_data: [
          { id: 2, key: "_retention_done", value: "2026-09-01T00:00:00.000Z" },
        ],
      }),
    );
    woo.seedOrder(order({ id: 3, status: "on-hold" }));

    const page = await client().listOrdersForRetention(1);
    const call = woo.calls.find((c) => c.path === "/orders")!;
    expect(call.query.get("orderby")).toBe("id");
    expect(call.query.get("order")).toBe("asc");
    expect(call.query.get("per_page")).toBe("100");
    expect(call.query.get("page")).toBe("1");
    expect(call.query.get("status")).toBeNull(); // WC default "any"
    expect(call.query.get("_fields")).toContain("customer_id");
    expect(call.init!.cache).toBe("no-store");

    expect(page.total).toBe(3);
    expect(page.totalPages).toBe(1);
    expect(page.orders).toEqual([
      {
        id: 1,
        status: "completed",
        closedAt: "2026-08-01T10:00:00.000Z",
        customerId: 0,
        designIds: ["d-1"],
        retainForReview: true,
        retentionDoneAt: null,
      },
      {
        id: 2,
        status: "cancelled",
        closedAt: "2026-08-03T10:00:00.000Z",
        customerId: 7,
        designIds: ["d-1"],
        retainForReview: false,
        retentionDoneAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: 3,
        status: "on-hold",
        closedAt: null,
        customerId: 0,
        designIds: ["d-1"],
        retainForReview: false,
        retentionDoneAt: null,
      },
    ]);
  });

  it("refuses a listing without X-WP-Total (the job must know it saw every order)", async () => {
    const noHeaders = (async () =>
      Response.json([], { headers: {} })) as unknown as typeof fetch;
    const c = createWooCommerceClient({
      url: "https://shop.test",
      consumerKey: "k",
      consumerSecret: "s",
      webhookSecret: "w",
      fetch: noHeaders,
    });
    await expect(c.listOrdersForRetention(1)).rejects.toBeInstanceOf(
      WooCommerceError,
    );
    await expect(c.listOrdersForRetention(0)).rejects.toThrow(/Invalid page/);
  });

  it("marks an order as purged with _retention_done order meta", async () => {
    woo.seedOrder(order({ id: 9 }));
    await client().markRetentionDone(9, "2026-09-29T22:30:00.000Z");
    const put = woo.calls.find((c) => c.method === "PUT")!;
    expect(put.path).toBe("/orders/9");
    expect(put.body).toEqual({
      meta_data: [
        { key: "_retention_done", value: "2026-09-29T22:30:00.000Z" },
      ],
    });
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
