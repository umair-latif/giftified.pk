import { describe, expect, it, vi } from "vitest";
import {
  hashId,
  pickTileImage,
  tileImage,
} from "@/features/templates/tile-image";
import { regularIfReduced } from "@/lib/commerce/woo-map";

vi.mock("server-only", () => ({}));

const mug = [
  { label: "Right" },
  { label: "Front" },
  { label: "Left" },
  { label: "Lifestyle" },
  { label: "Flat lay" },
];

describe("pickTileImage", () => {
  it("is null without images and stable per id", () => {
    expect(pickTileImage("a", undefined)).toBeNull();
    expect(pickTileImage("a", [])).toBeNull();
    expect(pickTileImage("abc", mug)).toBe(pickTileImage("abc", mug));
    expect(hashId("abc")).toBe(hashId("abc"));
  });

  it("only picks side views or lifestyle shots for a mug, and both kinds occur", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const n = pickTileImage(`design-${i}`, mug)!;
      expect([0, 2, 3, 4]).toContain(n);
      kinds.add(n === 3 || n === 4 ? "life" : "side");
    }
    expect(kinds).toEqual(new Set(["life", "side"]));
  });

  it("falls back to the flat artwork when it is all there is", () => {
    expect(pickTileImage("x", [{ label: "Design" }])).toBe(0);
  });

  it("tileImage falls back to the thumbnail", () => {
    expect(tileImage({ id: "t1", images: [], hasThumbnail: true })).toEqual({
      src: "/api/templates/t1/thumbnail",
      kind: "art",
    });
  });
});

describe("regularIfReduced", () => {
  it("returns the regular price only when higher than the price", () => {
    expect(regularIfReduced("1500", 1200)).toEqual({ regularPricePkr: 1500 });
    expect(regularIfReduced("1200", 1200)).toEqual({});
    expect(regularIfReduced("", 1200)).toEqual({});
    expect(regularIfReduced(undefined, 1200)).toEqual({});
  });
});
