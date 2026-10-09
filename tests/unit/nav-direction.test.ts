import { describe, expect, it } from "vitest";
import { flowRank, navDirection } from "@/components/site/nav-direction";

describe("navDirection", () => {
  it("going deeper in the shop flow is forward", () => {
    for (const [from, to] of [
      ["/", "/products"],
      ["/products", "/products/mug"],
      ["/products/mug", "/design/mug"],
      ["/design/mug", "/design/mug/preview"],
      ["/design/mug/preview", "/cart"],
      ["/cart", "/checkout"],
      ["/checkout", "/order/123"],
      ["/occasions/eid", "/designs/eid-mug"],
    ])
      expect(navDirection(from!, to!), `${from} → ${to}`).toBe("forward");
  });
  it("returning is back", () => {
    expect(navDirection("/design/mug/preview", "/design/mug")).toBe("back");
    expect(navDirection("/cart", "/products/tshirt")).toBe("back");
    expect(navDirection("/products/mug", "/")).toBe("back");
  });
  it("same level crossfades", () => {
    expect(navDirection("/help", "/contact")).toBe("fade");
    expect(navDirection("/products/mug", "/products/tshirt")).toBe("fade");
  });
  it("ignores a trailing slash", () => {
    expect(flowRank("/cart/")).toBe(flowRank("/cart"));
  });
});
