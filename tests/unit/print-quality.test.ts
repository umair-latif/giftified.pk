import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { printQualityReport } from "@/lib/print-quality";

const image = (sourceWidthPx: number, widthMm: number, extra: object = {}) => ({
  type: "Image",
  assetId: `a${sourceWidthPx}`,
  src: `asset:a${sourceWidthPx}`,
  sourceWidthPx,
  sourceHeightPx: sourceWidthPx,
  width: 1000, // preview pixels — irrelevant to DPI
  height: 1000,
  scaleX: widthMm / 1000,
  scaleY: widthMm / 1000,
  ...extra,
});

describe("print quality report", () => {
  it("is ok with no images (text-only fixture)", () => {
    const doc = JSON.parse(
      readFileSync(
        new URL("../fixtures/design-mug.json", import.meta.url),
        "utf8",
      ),
    ) as { fabric: Record<string, unknown> };
    expect(printQualityReport(doc.fabric)).toEqual({
      images: [],
      worstDpi: null,
      status: "ok",
    });
  });

  it("uses the ORIGINAL pixel size, not the preview size", () => {
    // 3000 px original printed 254 mm (10 in) wide = 300 DPI, even though the preview is 1000 px.
    const r = printQualityReport({ objects: [image(3000, 254)] });
    expect(r.worstDpi).toBeCloseTo(300, 5);
    expect(r.status).toBe("ok");
  });

  it("reports the worst image and blocks below 150 DPI", () => {
    const r = printQualityReport({
      objects: [image(3000, 100), image(1000, 254)],
    });
    expect(r.worstDpi).toBeCloseTo(100, 5);
    expect(r.status).toBe("block");
    expect(r.images.map((i) => i.status)).toEqual(["ok", "block"]);
  });

  it("warns between 150 and 200 DPI", () => {
    expect(printQualityReport({ objects: [image(1750, 254)] }).status).toBe(
      "warn",
    );
  });
});
