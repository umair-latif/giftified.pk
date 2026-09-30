import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getDesignProduct = vi.fn();
vi.mock("@/lib/commerce", () => ({
  getCommerce: () => ({ getDesignProduct }),
}));
const { withLiveDesigns } =
  await import("@/features/templates/load-design-prices");

const product = { slug: "s", wooProductId: 1, sku: "x" } as never;
const t = (id: string, withProduct: boolean) => ({
  id,
  ...(withProduct ? { product } : {}),
});

describe("withLiveDesigns", () => {
  it("keeps plain templates and live designs, drops designs deleted in WooCommerce", async () => {
    getDesignProduct.mockImplementation(async (id: string) =>
      id === "gone" ? null : { pricePkr: 900, regularPricePkr: 1200 },
    );
    const r = await withLiveDesigns([
      t("plain", false),
      t("live", true),
      t("gone", true),
    ]);
    expect(r.templates.map((x) => x.id)).toEqual(["plain", "live"]);
    expect(r.prices).toEqual({
      live: { pricePkr: 900, regularPricePkr: 1200 },
    });
  });

  it("keeps a design (without a price) when WooCommerce can't be reached", async () => {
    getDesignProduct.mockImplementation(() =>
      Promise.reject(new Error("down")),
    );
    const r = await withLiveDesigns([t("a", true)]);
    expect(r.templates).toHaveLength(1);
    expect(r.prices).toEqual({});
  });
});
