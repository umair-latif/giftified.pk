import { describe, expect, it } from "vitest";
import { CITIES, canonicalCity, searchCities } from "@/config/cities";
import { formatPkr } from "@/features/checkout/format";
import {
  CONTENT_NOT_CONFIRMED,
  DESIGN_NOT_SAVED,
  parseCheckout,
} from "@/features/checkout/schema";
import { createMockCommerce } from "@/lib/commerce/mock";
import { MAX_CART_LINES } from "@/types/cart";

const mugA = {
  productId: "mug",
  colourId: "white",
  designId: "k3Jd9sQx2LmN",
  quantity: 2,
};
const mugB = { ...mugA, designId: "p9Qw2ErTy7Ui", quantity: 1 };

const valid = {
  checkoutId: "3f2b8c1e-0000-4000-8000-000000000001",
  lines: [mugA, mugB],
  fullName: "  Ayesha   Khan ",
  phone: "0300-1234567",
  email: "",
  city: "lahore",
  addressLine: "House 12, Street 4, Model Town",
  landmark: "",
  contentConfirmed: true,
};

describe("parseCheckout (whole cart → one order)", () => {
  it("maps valid input to CreateOrderInput with one line per cart item", () => {
    const now = new Date("2026-09-29T08:30:00.000Z");
    const r = parseCheckout(valid, now);
    expect(r).toEqual({
      ok: true,
      order: {
        checkoutId: valid.checkoutId,
        consents: {
          contentConfirmedAt: "2026-09-29T08:30:00.000Z",
          marketingOptIn: false,
        },
        customer: {
          fullName: "Ayesha Khan",
          phone: "+923001234567",
          city: "Lahore",
          addressLine: "House 12, Street 4, Model Town",
        },
        lines: [
          {
            productId: "mug",
            colourId: "white",
            quantity: 2,
            designId: "k3Jd9sQx2LmN",
          },
          {
            productId: "mug",
            colourId: "white",
            quantity: 1,
            designId: "p9Qw2ErTy7Ui",
          },
        ],
      },
    });
  });

  it("keeps a size, a landmark and an 'Other' city as typed", () => {
    const r = parseCheckout({
      ...valid,
      lines: [{ ...mugA, size: " L " }],
      city: " Mandi  Bahauddin ",
      landmark: " Near Jamia Masjid ",
    });
    expect(r.ok && r.order.lines[0]?.size).toBe("L");
    expect(r.ok && r.order.customer).toMatchObject({
      city: "Mandi Bahauddin",
      landmark: "Near Jamia Masjid",
    });
  });

  describe("optional email", () => {
    it("is left out when empty or missing", () => {
      const noEmail = { ...valid } as Record<string, unknown>;
      delete noEmail.email;
      for (const input of [valid, noEmail, { ...valid, email: "   " }]) {
        const r = parseCheckout(input);
        expect(r.ok && r.order).not.toHaveProperty("email");
      }
    });
    it("is trimmed and lower-cased", () => {
      const r = parseCheckout({ ...valid, email: "  Ayesha.Khan@Gmail.COM " });
      expect(r.ok && r.order.email).toBe("ayesha.khan@gmail.com");
    });
    it("rejects something that isn't an email, in plain language", () => {
      const r = parseCheckout({ ...valid, email: "ayesha@" });
      expect(!r.ok && r.errors.email).toBe(
        "Please check your email address, or leave it empty.",
      );
    });
  });

  describe("content confirmation and marketing opt-in", () => {
    it.each([undefined, false, "true", "on", 1, null])(
      "rejects contentConfirmed = %s in plain language",
      (contentConfirmed) => {
        const r = parseCheckout({ ...valid, contentConfirmed });
        expect(!r.ok && r.errors.contentConfirmed).toBe(CONTENT_NOT_CONFIRMED);
      },
    );
    it("records the server's time, not anything the client sends", () => {
      const now = new Date("2026-09-29T10:00:00.000Z");
      const r = parseCheckout(
        { ...valid, contentConfirmedAt: "2020-01-01T00:00:00.000Z" },
        now,
      );
      expect(r.ok && r.order.consents?.contentConfirmedAt).toBe(
        now.toISOString(),
      );
    });
    it("treats the marketing opt-in as optional and off by default", () => {
      expect(parseCheckout(valid)).toMatchObject({
        ok: true,
        order: { consents: { marketingOptIn: false } },
      });
      expect(parseCheckout({ ...valid, marketingOptIn: false })).toMatchObject({
        ok: true,
        order: { consents: { marketingOptIn: false } },
      });
      expect(parseCheckout({ ...valid, marketingOptIn: true })).toMatchObject({
        ok: true,
        order: { consents: { marketingOptIn: true } },
      });
    });
    it("rejects an opt-in that isn't a real yes/no", () => {
      expect(parseCheckout({ ...valid, marketingOptIn: "yes" }).ok).toBe(false);
    });
  });

  it("ignores any price the client sends", () => {
    const r = parseCheckout({
      ...valid,
      totalPkr: 1,
      lines: [{ ...mugA, unitPricePkr: 1 }],
    });
    expect(r.ok && JSON.stringify(r.order)).not.toContain("Pkr");
  });

  it("reports every bad field in plain language", () => {
    const r = parseCheckout({
      ...valid,
      fullName: " ",
      phone: "042-35761234",
      city: "",
      addressLine: "Lahore",
      landmark: "x".repeat(121),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual({
      fullName: "Please write your full name.",
      phone: "Please write a Pakistani mobile number, like 0300 1234567.",
      city: "Please choose your city.",
      addressLine:
        "Please write your full address — house number, street and area.",
      landmark: "Please keep the landmark short.",
    });
  });

  it("asks for a missing phone number differently from a wrong one", () => {
    const r = parseCheckout({ ...valid, phone: "" });
    expect(!r.ok && r.errors.phone).toBe("Please write your mobile number.");
  });

  describe("limits", () => {
    it("needs at least one line", () => {
      const r = parseCheckout({ ...valid, lines: [] });
      expect(!r.ok && r.errors.lines).toBe("Your cart is empty.");
      expect(parseCheckout({ ...valid, lines: undefined }).ok).toBe(false);
    });
    it(`allows at most ${MAX_CART_LINES} lines`, () => {
      const lines = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ ...mugA, designId: `d${i}` }));
      expect(parseCheckout({ ...valid, lines: lines(MAX_CART_LINES) }).ok).toBe(
        true,
      );
      const r = parseCheckout({ ...valid, lines: lines(MAX_CART_LINES + 1) });
      expect(!r.ok && r.errors.lines).toBe(
        `You can order up to ${MAX_CART_LINES} designs at a time.`,
      );
    });
    it.each([0, 11, 1.5, "abc"])(
      "rejects quantity %s on any line",
      (quantity) => {
        const r = parseCheckout({
          ...valid,
          lines: [mugA, { ...mugB, quantity }],
        });
        expect(!r.ok && r.errors.lines).toBeTruthy();
      },
    );
    it("accepts quantity from a string (form data)", () => {
      const r = parseCheckout({
        ...valid,
        lines: [{ ...mugA, quantity: "10" }],
      });
      expect(r.ok && r.order.lines[0]?.quantity).toBe(10);
    });
  });

  it("rejects unknown products and colours on any line", () => {
    expect(
      parseCheckout({ ...valid, lines: [mugA, { ...mugB, productId: "sofa" }] })
        .ok,
    ).toBe(false);
    const r = parseCheckout({
      ...valid,
      lines: [mugA, { ...mugB, colourId: "neon" }],
    });
    expect(!r.ok && r.errors.lines).toBe(
      "An item in your cart can’t be ordered right now.",
    );
  });

  it("rejects missing or unsafe design IDs", () => {
    for (const designId of [undefined, "", "../x", "a/b"]) {
      const r = parseCheckout({ ...valid, lines: [{ ...mugA, designId }] });
      expect(!r.ok && r.errors.lines).toBe(DESIGN_NOT_SAVED);
    }
  });

  it("rejects missing or odd checkout IDs and non-objects", () => {
    expect(parseCheckout({ ...valid, checkoutId: "" }).ok).toBe(false);
    expect(parseCheckout({ ...valid, checkoutId: "a b c d e f g h" }).ok).toBe(
      false,
    );
    expect(parseCheckout(null).ok).toBe(false);
    expect(parseCheckout("hello").ok).toBe(false);
  });

  it("produces input the store accepts, once per checkoutId", async () => {
    const commerce = createMockCommerce();
    const r = parseCheckout({ ...valid, email: "a@b.pk" });
    if (!r.ok) throw new Error("expected valid");
    const a = await commerce.createOrder(r.order);
    const b = await commerce.createOrder(r.order);
    expect(b.id).toBe(a.id);
    expect(a.lines).toHaveLength(2);
    expect(a.totalPkr).toBe(1499 * 3 + 200);
    expect(a.email).toBe("a@b.pk");
  });
});

describe("cities", () => {
  it("has the 30 largest cities, unique", () => {
    expect(CITIES).toHaveLength(30);
    expect(new Set(CITIES).size).toBe(30);
  });

  it("canonicalises known cities, keeps others", () => {
    expect(canonicalCity(" rahim yar khan")).toBe("Rahim Yar Khan");
    expect(canonicalCity("DG Khan")).toBe("DG Khan");
    expect(canonicalCity("Abbottabad")).toBe("Abbottabad");
  });

  it("searches by prefix first, then substring", () => {
    expect(searchCities("")).toHaveLength(30);
    expect(searchCities("guj")).toEqual(["Gujranwala", "Gujrat"]);
    expect(searchCities("abad")[0]).toBe("Faisalabad");
    expect(searchCities("khan")).toEqual(["Rahim Yar Khan", "Dera Ghazi Khan"]);
    expect(searchCities("zzz")).toEqual([]);
  });
});

describe("formatPkr", () => {
  it.each([
    [0, "Rs 0"],
    [999, "Rs 999"],
    [1699, "Rs 1,699"],
    [1234567, "Rs 1,234,567"],
    [-250, "-Rs 250"],
  ])("%d → %s", (n, s) => {
    expect(formatPkr(n)).toBe(s);
  });
});
