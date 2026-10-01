import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createCanvas } from "canvas";
import sharp from "sharp";
import { printPixelSize } from "@/lib/units";
import { getProduct } from "@/config/products";
import { renderPrintFile } from "@/server/print";
import { readPngChunks, readPngDpi } from "@/server/print/png";
import {
  registerServerFonts,
  serverFontFor,
} from "@/server/print/server-fonts";
import type { DesignDocument } from "@/types/design";

vi.mock("server-only", () => ({}));

const PX_PER_MM = 300 / 25.4;

it("renders the provisional t-shirt at full resolution with transparent garment background", async () => {
  const product = getProduct("tshirt")!;
  const file = await renderPrintFile({
    schemaVersion: 1,
    productId: "tshirt",
    units: "mm",
    printArea: product.printArea,
    fabric: {
      background: "#171717",
      objects: [
        {
          type: "Rect",
          left: 20,
          top: 20,
          width: 10,
          height: 10,
          fill: "#ff0000",
        },
      ],
    },
  });
  expect(file).toMatchObject({ widthPx: 3543, heightPx: 4724, dpi: 300 });
  expect(readPngDpi(file.png)?.x).toBeCloseTo(300, 1);
  const { atMm } = await pixels(file.png);
  expect(atMm(0, 0)[3]).toBe(0);
  expect(atMm(20, 20)).toEqual([255, 0, 0, 255]);
});

const fixture = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "tests/fixtures/design-mug.json"),
    "utf8",
  ),
) as DesignDocument;

async function pixels(png: Uint8Array) {
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * 4;
    return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!] as const;
  };
  const atMm = (xMm: number, yMm: number) =>
    at(xMm * PX_PER_MM, yMm * PX_PER_MM);
  return { info, data, at, atMm };
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Expected ink region of each text object in px, derived from the objects:
 * lay them out with the same server font and take the rotated bounding box.
 */
async function textRegions(
  doc: DesignDocument,
  marginMm: number,
): Promise<Box[]> {
  await registerServerFonts();
  const { Textbox } = await import("fabric/node");
  return (doc.fabric.objects as Record<string, unknown>[]).map((o) => {
    const { text, ...rest } = o;
    delete rest.type;
    const box = new Textbox(String(text), {
      ...rest,
      fontFamily: `'${serverFontFor(String(o.fontFamily))!.family}'`,
    });
    const r = box.getBoundingRect();
    return {
      left: (r.left - marginMm) * PX_PER_MM,
      top: (r.top - marginMm) * PX_PER_MM,
      right: (r.left + r.width + marginMm) * PX_PER_MM,
      bottom: (r.top + r.height + marginMm) * PX_PER_MM,
    };
  });
}

const hexRgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const inside = (b: Box, x: number, y: number) =>
  x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;

describe("renderPrintFile — text fixture", () => {
  let png: Uint8Array;
  beforeAll(async () => {
    const file = await renderPrintFile(fixture);
    png = file.png;
    expect(file).toMatchObject({ widthPx: 2551, heightPx: 1051, dpi: 300 });
  });

  it("is exactly the mug print area at 300 DPI, with pHYs and sRGB", async () => {
    // The renderer sizes the file from the design's own saved print area.
    const expected = printPixelSize(
      fixture.printArea.widthMm,
      fixture.printArea.heightMm,
      300,
    );
    const { info } = await pixels(png);
    expect([info.width, info.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    expect(readPngDpi(png)).toEqual({ x: 300, y: 300 });
    const types = readPngChunks(png).map((c) => c.type);
    expect(types).toContain("sRGB");
    expect(types).not.toContain("bKGD");
    const meta = await sharp(png).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.space).toBe("srgb");
  });

  it("has transparent corners", async () => {
    const { at, info } = await pixels(png);
    const w = info.width - 1;
    const h = info.height - 1;
    for (const [x, y] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ] as const) {
      expect(at(x, y)[3]).toBe(0);
    }
  });

  it("puts ink only where the text objects are, in their colours", async () => {
    const regions = await textRegions(fixture, 1.5);
    const { data, info } = await pixels(png);
    const fills = (fixture.fabric.objects as { fill: string }[]).map((o) =>
      hexRgb(o.fill),
    );
    const inkPerObject = regions.map(() => 0);
    let stray = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (data[i + 3]! === 0) continue;
        if (!regions.some((r) => inside(r, x, y))) stray++;
        if (data[i + 3]! !== 255) continue;
        // Solid ink in an object's own colour must lie inside that object's box.
        fills.forEach((rgb, k) => {
          if (rgb.every((v, c) => data[i + c] === v)) {
            expect(inside(regions[k]!, x, y)).toBe(true);
            inkPerObject[k]!++;
          }
        });
      }
    }
    expect(stray).toBe(0);
    // Each text object left a substantial amount of solid ink in its colour.
    for (const n of inkPerObject) expect(n).toBeGreaterThan(5000);
  });

  it("honours a custom dpi", async () => {
    const file = await renderPrintFile(fixture, { dpi: 150 });
    expect([file.widthPx, file.heightPx]).toEqual([1276, 526]);
    expect(readPngDpi(file.png)).toEqual({ x: 150, y: 150 });
  });
});

// ---------------------------------------------------------------------------

const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const YELLOW = [255, 255, 0];

/** 3000×1200 original: red | green over blue | yellow. */
function quadrantPng(): Uint8Array {
  const c = createCanvas(3000, 1200);
  const ctx = c.getContext("2d");
  const fill = (rgb: number[], x: number, y: number) => {
    ctx.fillStyle = `rgb(${rgb.join(",")})`;
    ctx.fillRect(x, y, 1500, 600);
  };
  fill(RED, 0, 0);
  fill(GREEN, 1500, 0);
  fill(BLUE, 0, 600);
  fill(YELLOW, 1500, 600);
  return new Uint8Array(c.toBuffer("image/png"));
}

/**
 * As the editor stores it: preview 1000×400 (k = 3), crop = the middle half of
 * the preview (250,100 500×200 preview px), printed 100 × 40 mm, centred at
 * (108, 44.5) mm.
 */
function imageDesign(): DesignDocument {
  return {
    ...fixture,
    fabric: {
      version: "7.4.0",
      objects: [
        {
          type: "Image",
          version: "7.4.0",
          originX: "center",
          originY: "center",
          left: 108,
          top: 44.5,
          cropX: 250,
          cropY: 100,
          width: 500,
          height: 200,
          scaleX: 0.2,
          scaleY: 0.2,
          angle: 0,
          src: "asset:photo-1",
          assetId: "photo-1",
          sourceWidthPx: 3000,
          sourceHeightPx: 1200,
          previewWidthPx: 1000,
          previewHeightPx: 400,
        },
      ],
    },
  };
}

describe("renderPrintFile — images from originals", () => {
  const original = quadrantPng();
  const resolveAsset = vi.fn(async (id: string) => {
    if (id === "photo-1") return original;
    throw new Error("not found");
  });

  it("draws the cropped original at the stored size and place", async () => {
    const file = await renderPrintFile(imageDesign(), { resolveAsset });
    expect(resolveAsset).toHaveBeenCalledWith("photo-1");
    const { atMm } = await pixels(file.png);
    const rgb = (x: number, y: number) => {
      const p = atMm(x, y);
      expect(p[3]).toBe(255);
      return [p[0], p[1], p[2]];
    };
    // The crop is centred on the original's quadrant corner, so all four
    // quadrants meet at the image centre (108, 44.5).
    expect(rgb(108 - 25, 44.5 - 10)).toEqual(RED);
    expect(rgb(108 + 25, 44.5 - 10)).toEqual(GREEN);
    expect(rgb(108 - 25, 44.5 + 10)).toEqual(BLUE);
    expect(rgb(108 + 25, 44.5 + 10)).toEqual(YELLOW);
    // Printed size is exactly 100 × 40 mm: ink just inside the edges, none outside.
    expect(rgb(108 - 49.5, 44.5 - 19.5)).toEqual(RED);
    expect(rgb(108 + 49.5, 44.5 + 19.5)).toEqual(YELLOW);
    expect(atMm(108 - 50.5, 44.5)[3]).toBe(0);
    expect(atMm(108 + 50.5, 44.5)[3]).toBe(0);
    expect(atMm(108, 44.5 - 20.5)[3]).toBe(0);
    expect(atMm(108, 44.5 + 20.5)[3]).toBe(0);
  });

  it.each(["circle", "rounded", "heart", "arch", "star"])(
    "cuts a %s frame: centre inked, corners of the photo transparent",
    async (shape) => {
      const doc = imageDesign();
      (doc.fabric.objects as Record<string, unknown>[])[0]!.frameShape = shape;
      const file = await renderPrintFile(doc, { resolveAsset });
      const { atMm } = await pixels(file.png);
      // Just inside the centre of the box the shape is always inked …
      expect(atMm(108, 44.5 + 3)[3]).toBe(255);
      // … and every shape leaves the photo's top-left corner empty.
      expect(atMm(108 - 49, 44.5 - 19)[3]).toBe(0);
    },
  );

  it("draws the polaroid border outside the photo, white and opaque", async () => {
    const doc = imageDesign();
    (doc.fabric.objects as Record<string, unknown>[])[0]!.frameShape =
      "polaroid";
    const file = await renderPrintFile(doc, { resolveAsset });
    const { atMm } = await pixels(file.png);
    // Photo box is 100 × 40 mm centred (108, 44.5); side border = 6 mm, bottom = 22 mm.
    const white = (x: number, y: number) => {
      const p = atMm(x, y);
      expect([p[0], p[1], p[2], p[3]]).toEqual([255, 255, 255, 255]);
    };
    white(108 - 53, 44.5); // left border
    white(108, 44.5 - 20 - 3); // top border
    white(108, 44.5 + 20 + 15); // deep in the thicker bottom
    expect(atMm(108, 44.5 + 20 + 23.5)[3]).toBe(0); // just beyond the bottom border (86.5 mm)
    expect(atMm(108 - 60, 44.5)[3]).toBe(0);
    expect(atMm(108, 44.5)[3]).toBe(255); // photo still there
  });

  it("throws a clear error naming a missing asset", async () => {
    const doc = imageDesign();
    const obj = (doc.fabric.objects as Record<string, unknown>[])[0]!;
    obj.assetId = "gone-42";
    obj.src = "asset:gone-42";
    await expect(renderPrintFile(doc, { resolveAsset })).rejects.toThrow(
      /gone-42/,
    );
    await expect(renderPrintFile(doc)).rejects.toThrow(/resolveAsset.*gone-42/);
  });

  it("refuses an original whose size doesn't match the design", async () => {
    const doc = imageDesign();
    (doc.fabric.objects as Record<string, unknown>[])[0]!.sourceWidthPx = 4000;
    await expect(renderPrintFile(doc, { resolveAsset })).rejects.toThrow(
      /photo-1.*wrong file/,
    );
  });

  it("never renders images that aren't original uploads", async () => {
    const doc = imageDesign();
    const obj = (doc.fabric.objects as Record<string, unknown>[])[0]!;
    delete obj.assetId;
    obj.src = "https://example.com/preview.webp";
    await expect(renderPrintFile(doc, { resolveAsset })).rejects.toThrow(
      /asset id/,
    );
  });
});
