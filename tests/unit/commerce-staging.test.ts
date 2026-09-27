import { describe, expect, it, vi } from "vitest";

/**
 * Live check against the STAGING WooCommerce store. Skipped unless WC_SMOKE=1.
 *
 *   WC_SMOKE=1 WC_URL=https://staging... WC_CONSUMER_KEY=ck_... \
 *   WC_CONSUMER_SECRET=cs_... WC_WEBHOOK_SECRET=... \
 *   pnpm vitest run tests/unit/commerce-staging.test.ts
 *
 * Creates one real COD order (status On hold, `_design_id` = "smoke-test") and
 * adds a note — look for it in WP admin, then cancel/delete it there.
 */
vi.mock("server-only", () => ({}));

describe.skipIf(process.env.WC_SMOKE !== "1")(
  "WooCommerce staging smoke",
  () => {
    it("lists the catalog, quotes shipping and creates an on-hold COD order", async () => {
      const { createWooCommerceClient, wooConfigFromEnv } =
        await import("@/lib/commerce/woocommerce");
      const { newId } = await import("@/lib/id");
      const wc = createWooCommerceClient(wooConfigFromEnv());

      const catalog = await wc.listProducts();
      console.info("catalog", JSON.stringify(catalog, null, 2));
      const product = catalog[0];
      const variant = product?.variants.find((v) => v.inStock);
      expect(
        product && variant,
        "no in-stock product with SKU mug/tshirt/hoodie",
      ).toBeTruthy();

      const city = process.env.WC_SMOKE_CITY ?? "Lahore";
      console.info("shipping", await wc.quoteShipping(city));

      const checkoutId = `smoke-${newId()}`;
      const order = await wc.createOrder({
        checkoutId,
        customer: {
          fullName: "Smoke Test",
          phone: "+923001234567",
          city,
          addressLine: "Test address — please cancel",
        },
        lines: [
          {
            productId: product!.productId,
            colourId: variant!.colourId,
            ...(variant!.size ? { size: variant!.size } : {}),
            quantity: 1,
            designId: "smoke-test",
          },
        ],
      });
      console.info("order", order);
      expect(order.status).toBe("on-hold");
      expect(order.lines[0]?.designId).toBe("smoke-test");

      const again = await wc.createOrder({
        ...order,
        checkoutId,
        lines: order.lines,
      });
      expect(again.id).toBe(order.id);
      await wc.addOrderNote(
        order.id,
        "Smoke test order from commerce-staging.test.ts",
      );
    }, 60_000);
  },
);
