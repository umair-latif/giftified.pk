import { describe, expect, it, vi } from "vitest";
import { createMockCommerce } from "@/lib/commerce/mock";
import {
  assertSavedDesignList,
  parseSavedDesigns,
} from "@/lib/commerce/saved-designs";
import { MAX_SAVED_DESIGNS, type SavedDesign } from "@/lib/commerce/types";
import { CUSTOMER_META } from "@/lib/commerce/woo-map";
import { wooFixture } from "./commerce-woo-helpers";

vi.mock("server-only", () => ({}));
const { createWooCommerceClient } = await import("@/lib/commerce/woocommerce");

interface Call {
  url: URL;
  init: RequestInit;
}
function client(respond: (c: Call) => Response) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const call = { url: new URL(String(input)), init };
    calls.push(call);
    return respond(call);
  }) as typeof globalThis.fetch;
  return {
    calls,
    woo: createWooCommerceClient({
      url: "https://shop.test/",
      consumerKey: "ck",
      consumerSecret: "cs",
      webhookSecret: "wh",
      fetch,
    }),
  };
}
const body = (c: Call) => JSON.parse(String(c.init.body)) as unknown;

const wooCustomer = {
  id: 12,
  email: "ayesha@example.pk",
  first_name: "Ayesha",
  last_name: "Khan",
  date_modified_gmt: "2026-09-29T10:00:00",
};

const saved = (id: string, updatedAt: string): SavedDesign => ({
  id,
  productId: "mug",
  name: `Design ${id}`,
  source: "account",
  hasThumbnail: true,
  updatedAt,
});

describe("saved designs meta parsing", () => {
  it("reads a JSON string, sorts newest first and drops bad or duplicate entries", () => {
    const raw = JSON.stringify([
      saved("a", "2026-09-01T00:00:00Z"),
      saved("b", "2026-09-03T00:00:00Z"),
      { ...saved("c", "2026-09-02T00:00:00Z"), id: "../escape" },
      { ...saved("d", "2026-09-02T00:00:00Z"), productId: "poster" },
      saved("a", "2026-09-05T00:00:00Z"),
      { ...saved("e", "2026-09-04T00:00:00Z"), source: "order", orderId: 1001 },
    ]);
    expect(parseSavedDesigns(raw).map((d) => d.id)).toEqual(["e", "b", "a"]);
  });

  it("treats a missing, broken or non-list value as no designs", () => {
    expect(parseSavedDesigns(undefined)).toEqual([]);
    expect(parseSavedDesigns("{not json")).toEqual([]);
    expect(parseSavedDesigns({ id: "a" })).toEqual([]);
  });

  it("refuses to store more than the maximum or duplicates", () => {
    const many = Array.from({ length: MAX_SAVED_DESIGNS + 1 }, (_, i) =>
      saved(`d${i}`, "2026-09-01T00:00:00Z"),
    );
    expect(() => assertSavedDesignList(many)).toThrow(/At most/);
    const a = saved("a", "2026-09-01T00:00:00Z");
    expect(() => assertSavedDesignList([a, a])).toThrow(/Duplicate/);
  });
});

describe("WooCommerce account methods", () => {
  it("uses customer meta keys the customers REST API keeps (no leading underscore)", () => {
    // WooCommerce drops "protected" (_-prefixed) user meta on REST writes and
    // hides it on reads: a key like "_saved_designs" is never stored.
    for (const key of Object.values(CUSTOMER_META))
      expect(key).toMatch(/^(?!_|wp_)[a-z][a-z0-9_]*$/);
  });

  it("reads the marketing preference from customer meta", async () => {
    const { woo } = client(() =>
      Response.json({
        ...wooCustomer,
        meta_data: [{ id: 1, key: "giftified_marketing_optin", value: "yes" }],
      }),
    );
    expect((await woo.getCustomer(12))?.marketingOptIn).toBe(true);
    const off = client(() =>
      Response.json({
        ...wooCustomer,
        meta_data: [{ id: 1, key: "giftified_marketing_optin", value: "no" }],
      }),
    );
    expect((await off.woo.getCustomer(12))?.marketingOptIn).toBeUndefined();
  });

  it("saves name and marketing preference", async () => {
    const { woo, calls } = client(() => Response.json(wooCustomer));
    await woo.updateCustomerAccount(12, {
      firstName: "Sara",
      lastName: "Ali",
      marketingOptIn: false,
    });
    expect(calls[0]!.init.method).toBe("PUT");
    expect(calls[0]!.url.pathname).toBe("/wp-json/wc/v3/customers/12");
    expect(body(calls[0]!)).toEqual({
      first_name: "Sara",
      last_name: "Ali",
      meta_data: [{ key: "giftified_marketing_optin", value: "no" }],
    });
  });

  it("deletes the customer for good, and a missing one is fine", async () => {
    const { woo, calls } = client(() => Response.json(wooCustomer));
    await woo.deleteCustomer(12);
    expect(calls[0]!.init.method).toBe("DELETE");
    expect(calls[0]!.url.searchParams.get("force")).toBe("true");
    const gone = client(() =>
      Response.json(
        { code: "woocommerce_rest_invalid_id", message: "Invalid ID." },
        { status: 404 },
      ),
    );
    await expect(gone.woo.deleteCustomer(12)).resolves.toBeUndefined();
  });

  it("reads and writes the saved designs list as JSON customer meta", async () => {
    const list = [saved("a", "2026-09-01T00:00:00Z")];
    const { woo, calls } = client(() =>
      Response.json({
        ...wooCustomer,
        meta_data: [
          {
            id: 9,
            key: "giftified_saved_designs",
            value: JSON.stringify(list),
          },
        ],
      }),
    );
    expect(await woo.listSavedDesigns(12)).toEqual(list);
    await woo.setSavedDesigns(12, list);
    const put = calls[1]!;
    expect(put.init.method).toBe("PUT");
    expect(body(put)).toEqual({
      meta_data: [
        { key: "giftified_saved_designs", value: JSON.stringify(list) },
      ],
    });
    await expect(
      woo.setSavedDesigns(12, [
        { ...list[0]!, id: "../x" } as unknown as SavedDesign,
      ]),
    ).rejects.toThrow();
  });

  it("fails the save when WooCommerce answers OK but drops the list", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { woo } = client(() =>
      Response.json({
        ...wooCustomer,
        meta_data: [{ id: 3, key: "giftified_marketing_optin", value: "no" }],
      }),
    );
    await expect(
      woo.setSavedDesigns(12, [saved("a", "2026-09-01T00:00:00Z")]),
    ).rejects.toThrow(/didn't keep the saved designs/);
    expect(error).toHaveBeenCalledWith(
      "[commerce] saved designs not kept by WooCommerce",
      expect.objectContaining({
        customerId: 12,
        metaKeys: ["giftified_marketing_optin"],
      }),
    );
    error.mockRestore();
  });

  it("logs (but keeps the save) when the list is stored and a read returns an older copy", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const list = [saved("a", "2026-09-01T00:00:00Z")];
    const withList = {
      ...wooCustomer,
      meta_data: [
        { id: 9, key: "giftified_saved_designs", value: JSON.stringify(list) },
      ],
    };
    const { woo, calls } = client(({ init, url }) =>
      Response.json(
        // A cache serves the plain read; the cache-busted read is fresh.
        init.method === "GET" && !url.searchParams.has("_fresh")
          ? { ...wooCustomer, meta_data: [] }
          : withList,
      ),
    );
    await expect(woo.setSavedDesigns(12, list)).resolves.toBeUndefined();
    expect(calls.map((c) => c.init.method)).toEqual(["PUT", "GET", "GET"]);
    expect(error).toHaveBeenCalledWith(
      "[commerce] saved designs stored but read back stale",
      expect.objectContaining({
        plainRead: "(empty)",
        cacheBustedRead: "a@2026-09-01T00:00:00Z",
      }),
    );
    error.mockRestore();
  });

  it("lists a customer's orders newest first and never another customer's", async () => {
    const products = wooFixture<unknown[]>("products");
    const order = wooFixture<Record<string, unknown>>("order");
    const { woo, calls } = client(({ url }) => {
      if (url.pathname.endsWith("/orders"))
        return Response.json(
          [
            { ...order, id: 7002, customer_id: 12 },
            { ...order, id: 7001, customer_id: 99 },
          ],
          { headers: { "x-wp-totalpages": "3" } },
        );
      if (url.pathname.endsWith("/variations"))
        return Response.json(wooFixture("variations-mug"));
      return Response.json(products, { headers: { "x-wp-totalpages": "1" } });
    });
    const page = await woo.listCustomerOrders(12, 2);
    expect(page.orders.map((o) => o.id)).toEqual([7002]);
    expect(page.totalPages).toBe(3);
    const q = calls.find((c) => c.url.pathname.endsWith("/orders"))!.url
      .searchParams;
    expect(q.get("customer")).toBe("12");
    expect(q.get("page")).toBe("2");
    expect(q.get("order")).toBe("desc");
  });

  it("returns a customer's order only when it is theirs", async () => {
    const products = wooFixture<unknown[]>("products");
    const order = wooFixture<Record<string, unknown>>("order");
    const { woo } = client(({ url }) => {
      if (/\/orders\/\d+$/.test(url.pathname))
        return Response.json({ ...order, customer_id: 12 });
      if (url.pathname.endsWith("/variations"))
        return Response.json(wooFixture("variations-mug"));
      return Response.json(products, { headers: { "x-wp-totalpages": "1" } });
    });
    expect(await woo.getCustomerOrder(12, 7002)).not.toBeNull();
    expect(await woo.getCustomerOrder(13, 7002)).toBeNull();
    expect(await woo.getCustomerOrder(0, 7002)).toBeNull();
  });
});

describe("mock commerce account methods", () => {
  it("keeps orders, saved designs and preferences per customer", async () => {
    const commerce = createMockCommerce();
    const c = (await commerce.createCustomer({
      email: "a@example.pk",
      firstName: "A",
      lastName: "B",
      password: "pw-pw-pw-pw",
    }))!;
    const line = {
      productId: "mug" as const,
      colourId: "white",
      quantity: 1,
      designId: "d-1",
    };
    const customer = {
      fullName: "A B",
      phone: "+923001234567" as const,
      city: "Lahore",
      addressLine: "House 1",
    };
    const mine = await commerce.createOrder({
      checkoutId: "chk-mine-0001",
      customer,
      customerId: c.id,
      lines: [line],
    });
    const guest = await commerce.createOrder({
      checkoutId: "chk-guest-001",
      customer,
      lines: [line],
    });
    expect(
      (await commerce.listCustomerOrders(c.id)).orders.map((o) => o.id),
    ).toEqual([mine.id]);
    expect(await commerce.getCustomerOrder(c.id, guest.id)).toBeNull();
    expect(await commerce.getCustomerOrder(c.id, mine.id)).not.toBeNull();

    await commerce.updateCustomerAccount(c.id, {
      firstName: "Sara",
      lastName: "Ali",
      marketingOptIn: true,
    });
    expect(await commerce.getCustomer(c.id)).toMatchObject({
      firstName: "Sara",
      marketingOptIn: true,
    });

    const list = [saved("x", "2026-09-01T00:00:00Z")];
    await commerce.setSavedDesigns(c.id, list);
    expect(await commerce.listSavedDesigns(c.id)).toEqual(list);

    await commerce.deleteCustomer(c.id);
    expect(await commerce.getCustomer(c.id)).toBeNull();
    // Orders stay (accounting), only the account is gone.
    expect(await commerce.getOrder(mine.id)).not.toBeNull();
  });
});
