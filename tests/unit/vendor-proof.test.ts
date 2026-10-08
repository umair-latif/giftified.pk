import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { downscale, encodePng, pngSize, thumbnail } from "@/server/pdf/png";
import { formatPkDate, redactPhones } from "@/server/pdf/text";
import type { VendorProofInput } from "@/server/pdf/types";
import { buildVendorProof } from "@/server/pdf/vendor-proof";

const preview = new Uint8Array(
  readFileSync(new URL("../fixtures/design-mug-preview.png", import.meta.url)),
);

/** A 2551 × 1051 (216 × 89 mm @ 300 DPI) PNG, noisy so it compresses badly. */
function fullSizePrintPng(): Uint8Array {
  const w = 2551;
  const h = 1051;
  const data = new Uint8Array(w * h * 4);
  let seed = 42;
  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = seed & 0xff;
    data[i + 1] = (seed >>> 8) & 0xff;
    data[i + 2] = (seed >>> 16) & 0xff;
    data[i + 3] = (i / 4) % w < w / 2 ? 255 : 0; // right half transparent
  }
  return encodePng({ width: w, height: h, data });
}

function input(over: Partial<VendorProofInput> = {}): VendorProofInput {
  return {
    orderId: 5123,
    createdAt: "2026-09-28T09:05:00Z",
    productId: "mug",
    productName: "Custom Mug",
    colourName: "Gloss White",
    quantity: 2,
    print: {
      widthMm: 216,
      heightMm: 89,
      dpi: 300,
      placement: "Full wrap, centre opposite the handle",
      offsetXMm: 0,
      offsetYMm: 0,
    },
    printPng: preview,
    customerCity: "Lahore",
    ...over,
  };
}

/**
 * Pulls the drawn text out of a pdf-lib PDF: inflate every stream, then decode
 * the hex strings passed to `Tj` (WinAnsi = Windows-1252 bytes).
 */
const winAnsi = new TextDecoder("windows-1252");
function pdfText(pdf: Uint8Array): string {
  const raw = Buffer.from(pdf).toString("latin1");
  const parts: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    const body = Buffer.from(raw.slice(start, end), "latin1");
    let content: string;
    try {
      content = inflateSync(body).toString("latin1");
    } catch {
      content = body.toString("latin1");
    }
    for (const t of content.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g))
      parts.push(winAnsi.decode(Buffer.from(t[1]!, "hex")));
  }
  return parts.join("\n");
}

const PK_MOBILE = /(\+92|0092|\b0)?\s*3\d{2}[\s-]?\d{7}/;
const LONG_DIGITS = /\d(?:[\s\-().]*\d){8,}/;

describe("buildVendorProof", () => {
  it("builds a one-page PDF with the order essentials", async () => {
    const pdf = await buildVendorProof(input());
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeLessThan(2 * 1024 * 1024);
    const text = pdfText(pdf);
    for (const s of [
      "DesignBanana.pk — Production Proof",
      "ORDER #5123",
      "QTY 2",
      "Custom Mug",
      "Gloss White",
      "216 × 89 mm",
      "2551 × 1051 px at 300 DPI",
      "Print at 100% · 300 DPI · colours sRGB",
      "Lahore",
      "HANDLE",
      "28 Sep 2026, 14:05 PKT",
    ])
      expect(text).toContain(s);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });

  it("never prints a phone number, even when one is typed into notes/placement", async () => {
    const pdf = await buildVendorProof(
      input({
        notes:
          "Customer said call 0300-1234567 or +92 321 7654321 before delivery",
        print: {
          ...input().print,
          placement: "Centred, ask 03001234567 if unsure",
        },
      }),
    );
    const text = pdfText(pdf);
    expect(text).toContain("[number removed]");
    expect(text).not.toMatch(PK_MOBILE);
    expect(text).not.toMatch(LONG_DIGITS);
  });

  it("stays under 2 MB with a full-size 300 DPI PNG and a mockup", async () => {
    const big = fullSizePrintPng();
    expect(big.length).toBeGreaterThan(2 * 1024 * 1024);
    const pdf = await buildVendorProof(
      input({ printPng: big, mockupPng: big }),
    );
    expect(pdf.length).toBeLessThan(2 * 1024 * 1024);
    // Right size → no warning.
    expect(pdfText(pdf)).not.toContain("CHECK:");
  }, 30_000);

  it("warns the vendor when the PNG isn't the exact print size", async () => {
    const text = pdfText(await buildVendorProof(input()));
    expect(text).toContain(
      "CHECK: attached PNG is 1080 × 445 px, expected 2551 × 1051 px",
    );
  });

  it("is deterministic for the same input", async () => {
    const a = await buildVendorProof(input());
    const b = await buildVendorProof(input());
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("replaces characters the font can't draw instead of failing", async () => {
    const pdf = await buildVendorProof(
      input({ customerCity: "لاہور", notes: "🎉 Mubarak" }),
    );
    const text = pdfText(pdf);
    expect(text).toContain("?????");
    expect(text).toContain("? Mubarak");
  });

  it("draws the schematic diagram for garments, with size", async () => {
    const pdf = await buildVendorProof(
      input({
        productId: "tshirt",
        productName: "Custom T-Shirt",
        colourName: "Black",
        size: "L",
        print: { ...input().print, widthMm: 280, heightMm: 350, offsetYMm: 80 },
      }),
    );
    const text = pdfText(pdf);
    expect(text).toContain("PRODUCT FRONT (schematic, not to scale)");
    expect(text).toContain("Y 80 mm");
    expect(text).not.toContain("HANDLE");
  });

  it("rejects impossible input", async () => {
    await expect(buildVendorProof(input({ quantity: 0 }))).rejects.toThrow(
      /quantity/,
    );
    await expect(
      buildVendorProof(input({ print: { ...input().print, dpi: 0 } })),
    ).rejects.toThrow(/dpi/);
    await expect(
      buildVendorProof(input({ printPng: new Uint8Array([1, 2, 3]) })),
    ).rejects.toThrow(/PNG/);
  });
});

describe("proof helpers", () => {
  it("downscales in premultiplied alpha (no dark fringe on transparency)", () => {
    // 2×1: opaque white next to fully transparent black → 1×1 half-transparent WHITE.
    const img = downscale(
      {
        width: 2,
        height: 1,
        data: new Uint8Array([255, 255, 255, 255, 0, 0, 0, 0]),
      },
      1,
      1,
    );
    expect(Array.from(img.data)).toEqual([255, 255, 255, 128]);
  });

  it("makes thumbnails that fit the box and never upscales", () => {
    const t = thumbnail(preview, 540, 540, 10_000_000);
    expect(t).toMatchObject({ width: 540, height: 223 });
    expect(pngSize(t.png)).toEqual({ width: 540, height: 223 });
    expect(thumbnail(preview, 4000, 4000, 10_000_000).png).toBe(preview);
  });

  it("redacts phone-like numbers but keeps order IDs and sizes", () => {
    expect(redactPhones("Order 5123, 216 mm, call 0321 7654321")).toBe(
      "Order 5123, 216 mm, call [number removed]",
    );
  });

  it("formats dates in Pakistan time", () => {
    expect(formatPkDate("2026-09-27T20:30:00Z")).toBe("28 Sep 2026, 01:30 PKT");
  });
});
