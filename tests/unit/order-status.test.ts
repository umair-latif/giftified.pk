import { describe, expect, it, vi } from "vitest";
import { maskMobileForDisplay } from "@/features/orders/mask";
import { loadOrderForLink } from "@/features/orders/order-access";
import { toOrderView } from "@/features/orders/order-view";
import { orderTimeline } from "@/features/orders/timeline";
import { createMockCommerce } from "@/lib/commerce/mock";
import { mapOrder, mapProduct } from "@/lib/commerce/woo-map";
import {
  wooOrderSchema,
  wooProductSchema,
  wooVariationSchema,
} from "@/lib/commerce/woo-schemas";
import { orderToken } from "@/server/orders/order-link";
import type { Order } from "@/types/order";
import { wooFixture } from "./commerce-woo-helpers";

const env = { FILES_LINK_SECRET: "test-secret", NODE_ENV: "production" };
const PHONE = "+923001234567" as const;

async function placedOrder() {
  const commerce = createMockCommerce();
  const order = await commerce.createOrder({
    checkoutId: "chk-status-1",
    customer: {
      fullName: "Ayesha Khan",
      phone: PHONE,
      city: "Lahore",
      addressLine: "House 12, Street 4, Model Town",
      landmark: "Near the park",
    },
    email: "ayesha@example.pk",
    lines: [
      { productId: "mug", colourId: "white", quantity: 2, designId: "d1" },
    ],
  });
  return { commerce, order };
}

describe("order link access (/order/[id]?t=)", () => {
  it("opens with the right token", async () => {
    const { commerce, order } = await placedOrder();
    const t = orderToken(order.id, PHONE, env);
    const found = await loadOrderForLink(String(order.id), t, commerce, env);
    expect(found?.id).toBe(order.id);
  });

  it("rejects a missing, malformed or repeated token without asking the store", async () => {
    const { commerce, order } = await placedOrder();
    const getOrder = vi.spyOn(commerce, "getOrder");
    const t = orderToken(order.id, PHONE, env);
    for (const bad of [undefined, "", "abc", `${t}x`, "<script>", [t, t]])
      expect(
        await loadOrderForLink(String(order.id), bad, commerce, env),
      ).toBeNull();
    expect(getOrder).not.toHaveBeenCalled();
  });

  it("rejects a well-formed but wrong token (guessed number, other order's token)", async () => {
    const { commerce, order } = await placedOrder();
    const forOther = orderToken(order.id + 1, PHONE, env);
    const otherPhone = orderToken(order.id, "+923009999999", env);
    const otherSecret = orderToken(order.id, PHONE, {
      ...env,
      FILES_LINK_SECRET: "another-secret",
    });
    for (const t of [forOther, otherPhone, otherSecret, "A".repeat(22)])
      expect(
        await loadOrderForLink(String(order.id), t, commerce, env),
      ).toBeNull();
  });

  it("rejects malformed ids and unknown orders", async () => {
    const { commerce, order } = await placedOrder();
    const t = orderToken(order.id, PHONE, env);
    for (const id of ["abc", "-1", "1e3", "1".repeat(13), `${order.id}.0`])
      expect(await loadOrderForLink(id, t, commerce, env)).toBeNull();
    expect(
      await loadOrderForLink(
        "99999",
        orderToken(99999, PHONE, env),
        commerce,
        env,
      ),
    ).toBeNull();
  });
});

describe("phone masking and what the page may show", () => {
  it("masks mobiles as 0300 •••• 567", () => {
    expect(maskMobileForDisplay("+923001234567")).toBe("0300 •••• 567");
    expect(maskMobileForDisplay("+923451112223")).toBe("0345 •••• 223");
    expect(maskMobileForDisplay("+92bad" as `+92${string}`)).toBe("•••• •••");
  });

  it("the page model has no name, full phone, street address, landmark or email", async () => {
    const { order } = await placedOrder();
    const view = toOrderView(order);
    const json = JSON.stringify(view);
    for (const secret of [
      "Ayesha",
      "3001234567",
      "1234567",
      "House 12",
      "Model Town",
      "Near the park",
      "ayesha@example.pk",
    ])
      expect(json).not.toContain(secret);
    expect(view.city).toBe("Lahore");
    expect(view.maskedPhone).toBe("0300 •••• 567");
    expect(view.lines).toEqual([
      {
        name: "Custom Mug",
        variant: "Gloss White",
        quantity: 2,
        unitPricePkr: 1499,
        lineTotalPkr: 2998,
      },
    ]);
    expect(view.totalPkr).toBe(2998 + view.shippingPkr);
  });
});

describe("order timeline", () => {
  const states = (o: Pick<Order, "status" | "tracking">) =>
    orderTimeline(o).map((s) => `${s.id}:${s.state}`);
  const tracking = { courier: "TCS", number: "771234" };

  it("on-hold → Placed is current", () => {
    expect(states({ status: "on-hold" })).toEqual([
      "placed:current",
      "confirmed:upcoming",
      "shipped:upcoming",
      "delivered:upcoming",
    ]);
  });

  it("processing → Confirmed; with tracking → Shipped (with courier details)", () => {
    expect(states({ status: "processing" })).toEqual([
      "placed:done",
      "confirmed:current",
      "shipped:upcoming",
      "delivered:upcoming",
    ]);
    const shipped = orderTimeline({ status: "processing", tracking });
    expect(shipped.map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
    expect(shipped[2]).toMatchObject({ label: "Shipped", tracking });
  });

  it("completed → Delivered", () => {
    expect(states({ status: "completed", tracking })).toEqual([
      "placed:done",
      "confirmed:done",
      "shipped:done",
      "delivered:current",
    ]);
  });

  it("cancelled shows Cancelled instead of the rest", () => {
    expect(states({ status: "cancelled", tracking })).toEqual([
      "placed:done",
      "cancelled:current",
    ]);
  });
});

describe("tracking meta from WooCommerce → Shipped step", () => {
  const products = wooProductSchema.array().parse(wooFixture("products"));
  const variations = wooVariationSchema
    .array()
    .parse(wooFixture("variations-mug"));
  const catalog = [
    mapProduct(
      products.find((p) => p.sku === "mug")!,
      variations,
    )!,
  ];
  const raw = wooFixture<{ meta_data: unknown[] }>("order");
  const withMeta = (meta: { key: string; value: string }[]) =>
    mapOrder(
      wooOrderSchema.parse({
        ...raw,
        status: "processing",
        meta_data: [...raw.meta_data, ...meta],
      }),
      catalog,
    );

  it("maps _courier, _tracking_number and an https _tracking_url", () => {
    const order = withMeta([
      { key: "_courier", value: "Leopards" },
      { key: "_tracking_number", value: "LE123456" },
      { key: "_tracking_url", value: "https://leopardscourier.com/t/LE123456" },
    ]);
    expect(order.tracking).toEqual({
      courier: "Leopards",
      number: "LE123456",
      url: "https://leopardscourier.com/t/LE123456",
    });
    const shipped = toOrderView(order).timeline.find((s) => s.id === "shipped");
    expect(shipped).toMatchObject({
      state: "current",
      tracking: order.tracking,
    });
  });

  it("needs both courier and number; drops non-https links", () => {
    expect(
      withMeta([{ key: "_courier", value: "TCS" }]).tracking,
    ).toBeUndefined();
    expect(
      withMeta([
        { key: "_courier", value: "TCS" },
        { key: "_tracking_number", value: "1" },
        { key: "_tracking_url", value: "http://tcs.example/1" },
      ]).tracking,
    ).toEqual({ courier: "TCS", number: "1" });
    expect(
      toOrderView(withMeta([{ key: "_courier", value: "TCS" }])).timeline.find(
        (s) => s.state === "current",
      )?.id,
    ).toBe("confirmed");
  });
});
