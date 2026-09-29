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
      placeholders: 0,
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

  it("accounts for cropping: only the visible part of the original is printed", () => {
    // Keep the left half of a 3000 px original (preview 1000 px) and print it 127 mm (5 in) wide.
    const cropped = image(3000, 127, {
      width: 500,
      previewWidthPx: 1000,
      previewHeightPx: 1000,
      scaleX: 127 / 500,
      scaleY: 127 / 500,
    });
    const r = printQualityReport({ objects: [cropped] });
    expect(r.images[0]!.dpi).toBeCloseTo(300, 5); // 1500 px over 5 in
  });
});
