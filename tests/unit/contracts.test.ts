import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mug } from "@/config/products/mug";
import { createMockCommerce } from "@/lib/commerce/mock";
import { isDesignDocument } from "@/types/design";
import type { CreateOrderInput } from "@/types/order";

const fixture: unknown = JSON.parse(
  readFileSync(new URL("../fixtures/design-mug.json", import.meta.url), "utf8"),
);

describe("design fixture", () => {
  it("is a valid mug DesignDocument", () => {
    // Its print area is a snapshot (216 x 89 mm); the live mug config may differ
    // once vendor specs arrive, which is fine for a sample design.
    expect(isDesignDocument(fixture, "mug")).toBe(true);
    expect(mug.id).toBe("mug");
  });

  it("rejects wrong products and malformed input", () => {
    expect(isDesignDocument(fixture, "hoodie")).toBe(false);
    expect(isDesignDocument({ ...(fixture as object), units: "px" })).toBe(
      false,
    );
    expect(isDesignDocument(null)).toBe(false);
  });
});

describe("mock commerce", () => {
  const input: CreateOrderInput = {
    checkoutId: "chk-1",
    customer: {
      fullName: "Ayesha Khan",
      phone: "+923001234567",
      city: "Lahore",
      addressLine: "House 12, Street 4, Model Town",
    },
    lines: [
      { productId: "mug", colourId: "white", quantity: 2, designId: "d-1" },
    ],
  };

  it("prices from the catalog and creates an on-hold COD order", async () => {
    const commerce = createMockCommerce();
    const order = await commerce.createOrder(input);
    expect(order.status).toBe("on-hold");
    expect(order.paymentMethod).toBe("cod");
    expect(order.lines[0]?.unitPricePkr).toBe(1499);
    expect(order.totalPkr).toBe(1499 * 2 + 200);
  });

  it("is idempotent on checkoutId", async () => {
    const commerce = createMockCommerce();
    const a = await commerce.createOrder(input);
    const b = await commerce.createOrder(input);
    expect(b.id).toBe(a.id);
  });

  it("rejects unknown colours", async () => {
    const commerce = createMockCommerce();
    await expect(
      commerce.createOrder({
        ...input,
        checkoutId: "chk-2",
        lines: [{ ...input.lines[0]!, colourId: "gold" }],
      }),
    ).rejects.toThrow(/Unknown product/);
  });
});
