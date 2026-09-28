import { describe, expect, it } from "vitest";
import { CITIES, canonicalCity, searchCities } from "@/config/cities";
import { formatPkr } from "@/features/checkout/format";
import { parseCheckout } from "@/features/checkout/schema";
import { createMockCommerce } from "@/lib/commerce/mock";

const valid = {
  checkoutId: "3f2b8c1e-0000-4000-8000-000000000001",
  productId: "mug",
  colourId: "white",
  designId: "k3Jd9sQx2LmN",
  quantity: 2,
  fullName: "  Ayesha   Khan ",
  phone: "0300-1234567",
  city: "lahore",
  addressLine: "House 12, Street 4, Model Town",
  landmark: "",
};

describe("parseCheckout", () => {
  it("maps valid input to CreateOrderInput, normalised", () => {
    const r = parseCheckout(valid);
    expect(r).toEqual({
      ok: true,
      order: {
        checkoutId: valid.checkoutId,
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
        ],
      },
    });
  });

  it("keeps a landmark and an 'Other' city as typed", () => {
    const r = parseCheckout({
      ...valid,
      city: " Mandi  Bahauddin ",
      landmark: " Near Jamia Masjid ",
    });
    expect(r.ok && r.order.customer).toMatchObject({
      city: "Mandi Bahauddin",
      landmark: "Near Jamia Masjid",
    });
  });

  it("ignores any price the client sends", () => {
    const r = parseCheckout({ ...valid, unitPricePkr: 1, totalPkr: 1 });
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

  it.each([0, 11, 1.5, "abc"])("rejects quantity %s", (quantity) => {
    const r = parseCheckout({ ...valid, quantity });
    expect(!r.ok && r.errors.quantity).toBeTruthy();
  });

  it("accepts quantity from a string (form data)", () => {
    const r = parseCheckout({ ...valid, quantity: "10" });
    expect(r.ok && r.order.lines[0]?.quantity).toBe(10);
  });

  it("rejects unknown products and colours", () => {
    expect(parseCheckout({ ...valid, productId: "sofa" }).ok).toBe(false);
    expect(parseCheckout({ ...valid, colourId: "neon" }).ok).toBe(false);
  });

  it("rejects missing or odd checkout IDs", () => {
    expect(parseCheckout({ ...valid, checkoutId: "" }).ok).toBe(false);
    expect(parseCheckout({ ...valid, checkoutId: "a b c d e f g h" }).ok).toBe(
      false,
    );
  });

  it("rejects non-objects", () => {
    expect(parseCheckout({ ...valid, designId: undefined }).ok).toBe(false);
    expect(parseCheckout({ ...valid, designId: "../x" }).ok).toBe(false);
    expect(parseCheckout(null).ok).toBe(false);
    expect(parseCheckout("hello").ok).toBe(false);
  });

  it("produces input the store accepts, once per checkoutId", async () => {
    const commerce = createMockCommerce();
    const r = parseCheckout(valid);
    if (!r.ok) throw new Error("expected valid");
    const a = await commerce.createOrder(r.order);
    const b = await commerce.createOrder(r.order);
    expect(b.id).toBe(a.id);
    expect(a.totalPkr).toBe(1499 * 2 + 200);
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
