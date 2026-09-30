import { describe, expect, it } from "vitest";
import { addressSchema, profileSchema } from "@/features/account/schema";
import { orderStatusLabel } from "@/features/account/format";
import { createMockCommerce } from "@/lib/commerce/mock";
import { createMemoryStorage } from "@/lib/storage/memory";
import {
  AccountError,
  deleteAccount,
  reorderDesign,
  type AccountDeps,
} from "@/server/account/service";
import { addOrderDesigns } from "@/server/saved-designs/service";

async function setup() {
  const commerce = createMockCommerce();
  const { storage, objects } = createMemoryStorage("/x");
  let n = 0;
  const deps: AccountDeps = {
    commerce,
    storage,
    now: () => Date.parse("2026-09-30T10:00:00Z"),
    makeId: () => `s${++n}`,
  };
  const customer = (await commerce.createCustomer({
    email: `acc${Math.random()}@example.pk`,
    firstName: "Sara",
    lastName: "Ali",
    password: "pw-pw-pw-pw",
  }))!;
  let checkout = 0;
  async function order(
    designId: string,
    customerId: number | null = customer.id,
  ) {
    await storage.put(
      `designs/${designId}/design.json`,
      JSON.stringify(designDoc),
    );
    await storage.put(`designs/${designId}/assets/p1`, "jpeg");
    const o = await commerce.createOrder({
      checkoutId: `chk-acc-${++checkout}-000`,
      customer: {
        fullName: "Sara Ali",
        phone: "+923001234567",
        city: "Lahore",
        addressLine: "House 1",
      },
      ...(customerId ? { customerId } : {}),
      lines: [{ productId: "mug", colourId: "white", quantity: 1, designId }],
    });
    await storage.put(`orders/${o.id}/line-0/print.png`, "png");
    return o;
  }
  const keys = () => [...objects.keys()].sort();
  return { commerce, storage, deps, customer, order, keys };
}

const designDoc = {
  schemaVersion: 1,
  productId: "mug",
  units: "mm",
  printArea: { widthMm: 216, heightMm: 89, safeMarginMm: 5 },
  fabric: {
    objects: [{ type: "Image", src: "asset:p1", assetId: "p1" }],
  },
};

describe("delete account (task 21)", () => {
  it("is refused while an order is still open", async () => {
    const t = await setup();
    await t.order("d-open");
    await expect(deleteAccount(t.customer.id, t.deps)).rejects.toBeInstanceOf(
      AccountError,
    );
    expect(await t.commerce.getCustomer(t.customer.id)).not.toBeNull();
    expect(t.keys()).toContain("designs/d-open/design.json");
  });

  it("deletes saved designs, order designs and the customer; keeps orders, print files and other customers' files", async () => {
    const t = await setup();
    const mine = await t.order("d-mine");
    const guest = await t.order("d-guest", null);
    await addOrderDesigns(t.customer.id, mine, t.deps);
    await t.storage.put(
      `accounts/${t.customer.id}/designs/s9/design.json`,
      "{}",
    );
    await t.commerce.setOrderStatus(mine.id, "completed");

    await deleteAccount(t.customer.id, t.deps);
    expect(await t.commerce.getCustomer(t.customer.id)).toBeNull();
    expect(t.keys().some((k) => k.startsWith("accounts/"))).toBe(false);
    expect(t.keys().some((k) => k.startsWith("designs/d-mine/"))).toBe(false);
    // The order record stays (accounting); print files follow normal retention.
    expect(await t.commerce.getOrder(mine.id)).not.toBeNull();
    expect(t.keys()).toContain(`orders/${mine.id}/line-0/print.png`);
    expect(t.keys()).toContain("designs/d-guest/design.json");
    expect(guest.id).toBeGreaterThan(0);
  });
});

describe("order again (task 21)", () => {
  it("returns the design and photo links only for the customer's own order", async () => {
    const t = await setup();
    const o = await t.order("d-re");
    const r = await reorderDesign(t.customer.id, o.id, "d-re", t.deps);
    expect(r.design.productId).toBe("mug");
    expect(r.assetUrls).toEqual({ p1: "/x/designs/d-re/assets/p1" });

    const other = (await t.commerce.createCustomer({
      email: "other-acc@example.pk",
      firstName: "O",
      lastName: "T",
      password: "pw-pw-pw-pw",
    }))!;
    await expect(
      reorderDesign(other.id, o.id, "d-re", t.deps),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      reorderDesign(t.customer.id, o.id, "not-on-this-order", t.deps),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("explains when the design's files are gone", async () => {
    const t = await setup();
    const o = await t.order("d-gone");
    await t.storage.deletePrefix("designs/d-gone/");
    await expect(
      reorderDesign(t.customer.id, o.id, "d-gone", t.deps),
    ).rejects.toThrow(/no longer stored/);
  });
});

describe("account forms", () => {
  it("normalises the address like checkout", () => {
    const r = addressSchema.safeParse({
      phone: "0300 1234567",
      city: " lahore ",
      addressLine: "House 12,  Street 4, Model Town",
      landmark: "",
    });
    expect(r.success && r.data).toMatchObject({
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12, Street 4, Model Town",
    });
    expect(
      addressSchema.safeParse({ phone: "123", city: "X", addressLine: "a" })
        .success,
    ).toBe(false);
  });

  it("needs a first name; last name is optional", () => {
    expect(
      profileSchema.safeParse({ firstName: "", marketingOptIn: false }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ firstName: "Sara", marketingOptIn: true }).data,
    ).toEqual({ firstName: "Sara", lastName: "", marketingOptIn: true });
  });

  it("labels an order by where it is now", () => {
    expect(orderStatusLabel({ status: "on-hold" })).toBe("Placed");
    expect(orderStatusLabel({ status: "processing" })).toBe("Confirmed");
    expect(orderStatusLabel({ status: "completed" })).toBe("Delivered");
    expect(orderStatusLabel({ status: "cancelled" })).toBe("Cancelled");
  });
});
