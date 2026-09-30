import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders.current,
}));
const { placeOrder } = await import("@/features/checkout/actions");
const { getCommerce } = await import("@/lib/commerce");
const { getStorage } = await import("@/lib/storage");
const { designKey } = await import("@/lib/storage/keys");
const { verifyOrderToken } = await import("@/server/orders/order-link");

const input = (checkoutId: string, designIds: string[]) => ({
  checkoutId,
  lines: designIds.map((designId, i) => ({
    productId: "mug",
    colourId: "white",
    quantity: i === 0 ? 2 : 1,
    designId,
  })),
  fullName: "Ayesha Khan",
  phone: "0300 1234567",
  email: "Ayesha@Example.pk",
  city: "Lahore",
  addressLine: "House 12, Street 4, Model Town",
  contentConfirmed: true,
});

async function saveDesigns(...ids: string[]) {
  for (const id of ids) await getStorage().put(designKey(id), "{}");
}

describe("placeOrder (checkout v2 server action)", () => {
  it("creates one order for the whole cart and returns its private token URL", async () => {
    await saveDesigns("designA1", "designB1");
    const r = await placeOrder(
      input("chk-v2-000001", ["designA1", "designB1"]),
    );
    if (!r.ok) throw new Error(JSON.stringify(r));
    const url = new URL(r.statusUrl, "https://x.test");
    expect(url.pathname).toBe(`/order/${r.orderId}`);
    const t = url.searchParams.get("t")!;
    expect(t).toMatch(/^[\w-]{22}$/);
    expect(verifyOrderToken(r.orderId, "+923001234567", t)).toBe(true);
    expect(verifyOrderToken(r.orderId, "+923009999999", t)).toBe(false);
  });

  it("is idempotent on checkoutId (a retried tap gets the same order)", async () => {
    await saveDesigns("designA2");
    const a = await placeOrder(input("chk-v2-000002", ["designA2"]));
    const b = await placeOrder(input("chk-v2-000002", ["designA2"]));
    expect(a.ok && b.ok && a.orderId === b.orderId).toBe(true);
  });

  it("refuses to create an order when any design wasn't uploaded", async () => {
    await saveDesigns("designA3");
    const r = await placeOrder(
      input("chk-v2-000003", ["designA3", "neverUploaded"]),
    );
    expect(r).toEqual({
      ok: false,
      errors: { lines: "Your design wasn’t saved. Please try again." },
      message: "Your design wasn’t saved. Please try again.",
    });
  });

  it("returns field errors without touching the store for bad input", async () => {
    const r = await placeOrder({
      ...input("chk-v2-000004", ["designA1"]),
      phone: "123",
    });
    expect(!r.ok && r.errors.phone).toMatch(/Pakistani mobile/);
  });

  it("refuses an order without the content confirmation (never trusts the client)", async () => {
    await saveDesigns("designA5");
    const spy = vi.spyOn(getCommerce(), "createOrder");
    for (const contentConfirmed of [undefined, false, "true", "on"]) {
      const r = await placeOrder({
        ...input("chk-v2-000005", ["designA5"]),
        contentConfirmed,
      });
      expect(!r.ok && r.errors.contentConfirmed).toMatch(/tick the box/);
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("stores the consents with server time and the customer's IP", async () => {
    await saveDesigns("designA6");
    const spy = vi.spyOn(getCommerce(), "createOrder");
    requestHeaders.current = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "x-real-ip": "10.0.0.1",
    });
    const before = Date.now();
    const r = await placeOrder({
      ...input("chk-v2-000006", ["designA6"]),
      marketingOptIn: true,
    });
    requestHeaders.current = new Headers();
    expect(r.ok).toBe(true);
    const order = spy.mock.calls[0]![0];
    expect(order.customerIp).toBe("203.0.113.7");
    expect(order.consents?.marketingOptIn).toBe(true);
    const at = Date.parse(order.consents!.contentConfirmedAt);
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
    spy.mockRestore();
  });

  it("places the order without an IP when the headers carry none", async () => {
    await saveDesigns("designA7");
    const spy = vi.spyOn(getCommerce(), "createOrder");
    const r = await placeOrder(input("chk-v2-000007", ["designA7"]));
    expect(r.ok).toBe(true);
    expect(spy.mock.calls[0]![0]).not.toHaveProperty("customerIp");
    expect(spy.mock.calls[0]![0].consents?.marketingOptIn).toBe(false);
    spy.mockRestore();
  });
});

describe("placeOrder while signed in (task 20)", () => {
  it("attaches the customer id from the session cookie; guests stay guests", async () => {
    const cookies = await import("@/server/auth/cookies");
    const spy = vi.spyOn(cookies, "getSessionCustomerId");
    const commerce = getCommerce();
    const create = vi.spyOn(commerce, "createOrder");
    await saveDesigns("designAcct1", "designAcct2");

    spy.mockResolvedValueOnce(77);
    const signedIn = await placeOrder(
      input("chk-acct-000001", ["designAcct1"]),
    );
    expect(signedIn.ok).toBe(true);
    expect(create.mock.calls.at(-1)![0].customerId).toBe(77);

    spy.mockResolvedValueOnce(null);
    const guest = await placeOrder(input("chk-acct-000002", ["designAcct2"]));
    expect(guest.ok).toBe(true);
    expect(create.mock.calls.at(-1)![0].customerId).toBeUndefined();
  });
});

describe("checkout for signed-in customers (prefill, delivery, save)", () => {
  const fresh = (id: string, extra: Record<string, unknown> = {}) => ({
    ...input(id, ["designPre1"]),
    ...extra,
  });

  it("prefills from the account and offers to save when no address is stored", async () => {
    const cookies = await import("@/server/auth/cookies");
    const { getCheckoutPrefill } = await import("@/features/checkout/actions");
    const commerce = getCommerce();
    const c = await commerce.createCustomer({
      email: "prefill@example.pk",
      firstName: "Sara",
      lastName: "Ali",
      password: "pw-pw-pw-pw",
    });
    const spy = vi.spyOn(cookies, "getSessionCustomer");

    spy.mockResolvedValueOnce(null);
    expect(await getCheckoutPrefill()).toBeNull();

    spy.mockResolvedValueOnce(c);
    expect(await getCheckoutPrefill()).toEqual({
      fullName: "Sara Ali",
      email: "prefill@example.pk",
      offerSave: true,
    });

    await commerce.updateCustomerProfile(c!.id, {
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12, Street 4, Model Town",
      landmark: "Near GT Road",
    });
    spy.mockResolvedValueOnce(await commerce.getCustomer(c!.id));
    expect(await getCheckoutPrefill()).toEqual({
      fullName: "Sara Ali",
      email: "prefill@example.pk",
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12, Street 4, Model Town",
      landmark: "Near GT Road",
      offerSave: false,
    });
  });

  it("saves phone and address to the account when asked, not for guests or when unticked", async () => {
    const cookies = await import("@/server/auth/cookies");
    const commerce = getCommerce();
    const c = (await commerce.createCustomer({
      email: "save@example.pk",
      firstName: "Save",
      lastName: "Me",
      password: "pw-pw-pw-pw",
    }))!;
    await saveDesigns("designPre1");
    const spy = vi.spyOn(cookies, "getSessionCustomerId");
    const update = vi.spyOn(commerce, "updateCustomerProfile");

    spy.mockResolvedValueOnce(c.id);
    await placeOrder(fresh("chk-save-000001", { saveToAccount: false }));
    expect(update).not.toHaveBeenCalled();

    spy.mockResolvedValueOnce(null);
    await placeOrder(fresh("chk-save-000002", { saveToAccount: true }));
    expect(update).not.toHaveBeenCalled();

    spy.mockResolvedValueOnce(c.id);
    const r = await placeOrder(
      fresh("chk-save-000003", { saveToAccount: true }),
    );
    expect(r.ok).toBe(true);
    expect((await commerce.getCustomer(c.id))?.address).toEqual({
      city: "Lahore",
      addressLine: "House 12, Street 4, Model Town",
    });
    expect((await commerce.getCustomer(c.id))?.phone).toBe("+923001234567");
  });

  it("keeps the account's marketing preference in step with checkout (task 21)", async () => {
    const cookies = await import("@/server/auth/cookies");
    const { getCheckoutPrefill } = await import("@/features/checkout/actions");
    const commerce = getCommerce();
    const c = (await commerce.createCustomer({
      email: "optin@example.pk",
      firstName: "Opt",
      lastName: "In",
      password: "pw-pw-pw-pw",
    }))!;
    await saveDesigns("designOpt1");
    const spy = vi.spyOn(cookies, "getSessionCustomerId");

    spy.mockResolvedValueOnce(c.id);
    await placeOrder({
      ...input("chk-optin-000001", ["designOpt1"]),
      marketingOptIn: true,
    });
    expect((await commerce.getCustomer(c.id))?.marketingOptIn).toBe(true);
    const session = vi.spyOn(cookies, "getSessionCustomer");
    session.mockResolvedValueOnce(await commerce.getCustomer(c.id));
    expect((await getCheckoutPrefill())?.marketingOptIn).toBe(true);

    spy.mockResolvedValueOnce(c.id);
    await placeOrder(input("chk-optin-000002", ["designOpt1"]));
    expect((await commerce.getCustomer(c.id))?.marketingOptIn).toBeUndefined();
  });

  it("adds a signed-in order's designs to My designs (task 22), never a guest's", async () => {
    const cookies = await import("@/server/auth/cookies");
    const commerce = getCommerce();
    const c = (await commerce.createCustomer({
      email: "mydesigns@example.pk",
      firstName: "My",
      lastName: "Designs",
      password: "pw-pw-pw-pw",
    }))!;
    await saveDesigns("designMine1", "designGuest1");
    const spy = vi.spyOn(cookies, "getSessionCustomerId");

    spy.mockResolvedValueOnce(null);
    await placeOrder(input("chk-mine-000001", ["designGuest1"]));
    expect(await commerce.listSavedDesigns(c.id)).toEqual([]);

    spy.mockResolvedValueOnce(c.id);
    const r = await placeOrder(input("chk-mine-000002", ["designMine1"]));
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(await commerce.listSavedDesigns(c.id)).toEqual([
      expect.objectContaining({
        id: "designMine1",
        source: "order",
        orderId: r.orderId,
      }),
    ]);
  });

  it("ships to the delivery address and prices delivery for its city", async () => {
    await saveDesigns("designPre1");
    const r = await placeOrder(
      fresh("chk-gift-000001", {
        deliveryDifferent: true,
        deliveryName: "Sana Malik",
        deliveryCity: "Karachi",
        deliveryAddressLine: "Flat 4, Block B, Clifton",
      }),
    );
    if (!r.ok) throw new Error(JSON.stringify(r));
    const order = await getCommerce().getOrder(r.orderId);
    expect(order?.customer).toMatchObject({
      fullName: "Sana Malik",
      city: "Karachi",
      addressLine: "Flat 4, Block B, Clifton",
      phone: "+923001234567",
    });
    expect(order?.shippingPkr).toBe(250); // Karachi, not Lahore's 200
  });
});
