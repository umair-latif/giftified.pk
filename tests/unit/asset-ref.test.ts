import { describe, expect, it } from "vitest";
import {
  collectAssetIds,
  mapImageSources,
  parseAssetRef,
  toAssetRef,
  toPortableFabric,
} from "@/features/editor/assets/asset-ref";

const fabric = {
  version: "7.4.0",
  objects: [
    { type: "Textbox", text: "Hi" },
    {
      type: "Image",
      src: "blob:http://x/1",
      assetId: "a1",
      sourceWidthPx: 3000,
    },
    { type: "Image", src: "asset:a2", assetId: "a2" },
  ],
};

describe("asset refs", () => {
  it("round-trips ids", () => {
    expect(parseAssetRef(toAssetRef("abc"))).toBe("abc");
    expect(parseAssetRef("blob:x")).toBeNull();
    expect(parseAssetRef("asset:")).toBeNull();
    expect(parseAssetRef(42)).toBeNull();
  });

  it("rewrites runtime blob URLs to portable refs without touching text", () => {
    const out = toPortableFabric(fabric) as typeof fabric;
    expect(out.objects[0]).toEqual(fabric.objects[0]);
    expect(out.objects[1]!.src).toBe("asset:a1");
    expect(out.objects[2]!.src).toBe("asset:a2");
    expect(fabric.objects[1]!.src).toBe("blob:http://x/1"); // input not mutated
  });

  it("collects referenced asset ids", () => {
    expect(collectAssetIds(fabric).sort()).toEqual(["a1", "a2"]);
  });

  it("drops images when the mapper returns null", () => {
    const out = mapImageSources(fabric, () => null) as { objects: unknown[] };
    expect(out.objects).toHaveLength(1);
  });
});
