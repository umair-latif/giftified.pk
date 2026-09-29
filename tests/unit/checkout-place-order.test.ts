import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { placeOrder } = await import("@/features/checkout/actions");
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
});
