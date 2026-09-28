import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { __test } = await import("@/lib/commerce");

describe("getCommerce without WooCommerce configured", () => {
  it("uses the mock in development", () => {
    expect(() => __test.mockOrFail({ NODE_ENV: "development" })).not.toThrow();
  });

  it("refuses the in-memory mock in production (orders would silently vanish)", () => {
    expect(() => __test.mockOrFail({ NODE_ENV: "production" })).toThrow(
      /WC_URL is not set/,
    );
  });

  it("allows an explicit opt-in for demos and e2e", () => {
    expect(() =>
      __test.mockOrFail({ NODE_ENV: "production", COMMERCE_MOCK: "1" }),
    ).not.toThrow();
  });
});
