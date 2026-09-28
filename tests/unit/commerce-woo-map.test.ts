import { describe, expect, it } from "vitest";
import {
  colourIdFor,
  mapOrder,
  mapProduct,
  mapStatus,
  parsePkr,
  quoteFromZones,
  toPkMobile,
  type ZoneWithRates,
} from "@/lib/commerce/woo-map";
import {
  wooOrderSchema,
  wooProductSchema,
  wooShippingZoneSchema,
  wooVariationSchema,
  wooZoneMethodSchema,
} from "@/lib/commerce/woo-schemas";
import { wooFixture } from "./commerce-woo-helpers";

const products = wooProductSchema.array().parse(wooFixture("products"));
const variations = wooVariationSchema
  .array()
  .parse(wooFixture("variations-mug"));
const mugProduct = products.find((p) => p.sku === "mug")!;

function zones(): ZoneWithRates[] {
  const methods = wooFixture<Record<string, unknown>>("shipping-zone-methods");
  return wooShippingZoneSchema
    .array()
    .parse(wooFixture("shipping-zones"))
    .map((zone) => ({
      zone,
      methods: wooZoneMethodSchema.array().parse(methods[String(zone.id)]),
    }));
}

describe("catalog mapping", () => {
  it("maps a variable WC product to our CatalogProduct via SKU", () => {
    const p = mapProduct(mugProduct, variations);
    expect(p).toEqual({
      productId: "mug",
      wooProductId: 101,
      slug: "custom-mug",
      name: "Custom Mug",
      images: [],
      basePricePkr: 1499,
      variants: [
        {
          colourId: "white",
          colourName: "Gloss White",
          colourHex: "#ffffff",
          wooVariationId: 1011,
          pricePkr: 1499,
          inStock: true,
        },
        {
          colourId: "black",
          colourName: "Black",
          wooVariationId: 1012,
          pricePkr: 1699,
          inStock: false,
        },
      ],
    });
  });

  it("ignores products whose SKU is not one of ours", () => {
    const giftWrap = products.find((p) => p.sku === "gift-wrap")!;
    expect(mapProduct(giftWrap, [])).toBeNull();
  });

  it("drops variations without a price", () => {
    const [first] = variations;
    const p = mapProduct(mugProduct, [{ ...first!, price: "" }]);
    expect(p).toBeNull();
  });

  it("matches WC colour names to config colour ids", () => {
    expect(colourIdFor("mug", "Gloss White")).toBe("white");
    expect(colourIdFor("mug", "white")).toBe("white");
    expect(colourIdFor("mug", "Navy Blue")).toBe("navy-blue");
  });

  it("parses WC money strings to whole rupees", () => {
    expect(parsePkr("1499")).toBe(1499);
    expect(parsePkr("1699.00")).toBe(1699);
    expect(parsePkr("")).toBeNull();
    expect(parsePkr("abc")).toBeNull();
  });
});

describe("order mapping", () => {
  const catalog = [mapProduct(mugProduct, variations)!];

  it("maps a WC order to our Order", () => {
    const order = mapOrder(wooOrderSchema.parse(wooFixture("order")), catalog);
    expect(order).toEqual({
      id: 5123,
      status: "on-hold",
      createdAt: "2026-09-27T12:04:11.000Z",
      customer: {
        fullName: "Ayesha Khan",
        phone: "+923001234567",
        city: "Lahore",
        addressLine: "House 12, Street 4, Model Town",
        landmark: "Near Model Town Park",
      },
      lines: [
        {
          productId: "mug",
          colourId: "white",
          quantity: 2,
          designId: "d-1",
          unitPricePkr: 1499,
        },
      ],
      shippingPkr: 200,
      totalPkr: 3198,
      paymentMethod: "cod",
    });
  });

  it("maps WC statuses onto our four-state lifecycle", () => {
    expect(mapStatus("pending")).toBe("on-hold");
    expect(mapStatus("processing")).toBe("processing");
    expect(mapStatus("refunded")).toBe("cancelled");
    expect(mapStatus("checkout-draft")).toBeNull();
  });

  it("normalises hand-typed Pakistani mobiles", () => {
    expect(toPkMobile("0300-1234567")).toBe("+923001234567");
    expect(toPkMobile("0092 300 1234567")).toBe("+923001234567");
    expect(toPkMobile("042 35761234")).toBeNull();
  });

  it("doesn't fail an order typed in WP admin with a landline", () => {
    const raw = wooFixture("order") as { billing: { phone: string } };
    const order = mapOrder(
      wooOrderSchema.parse({
        ...raw,
        billing: { ...raw.billing, phone: "042 35761234" },
      }),
      catalog,
    );
    expect(order.customer.phone).toBe("+924235761234");
  });
});

describe("shipping by city", () => {
  it("uses the zone whose name lists the city", () => {
    expect(quoteFromZones("Lahore", zones())).toBe(200);
    expect(quoteFromZones(" sialkot ", zones())).toBe(150);
  });

  it("falls back to the Rest of Pakistan zone", () => {
    expect(quoteFromZones("Multan", zones())).toBe(300);
  });

  it("returns null when no zone has a flat rate", () => {
    const onlyNotCovered = zones().filter((z) => z.zone.id === 0);
    expect(quoteFromZones("Multan", onlyNotCovered)).toBeNull();
  });
});
