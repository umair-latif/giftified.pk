import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createCanvas } from "canvas";
import { FONTS } from "@/config/fonts";
import {
  parseFontStack,
  registerServerFonts,
  SERVER_FONTS,
  serverFontFiles,
  serverFontFor,
} from "@/server/print/server-fonts";

vi.mock("server-only", () => ({}));

function measure(font: string, text = "Happy Birthday!"): number {
  const ctx = createCanvas(10, 10).getContext("2d");
  ctx.font = font;
  return ctx.measureText(text).width;
}

describe("server print fonts", () => {
  beforeAll(async () => {
    await registerServerFonts();
  });

  it("parses CSS font stacks", () => {
    expect(parseFontStack(`Georgia, 'Times New Roman', "serif"`)).toEqual([
      "georgia",
      "times new roman",
      "serif",
    ]);
  });

  it.each(FONTS.map((f) => [f.label, f.family] as const))(
    "every editor font (%s) has a server font",
    (_label, family) => {
      expect(serverFontFor(family)).not.toBeNull();
    },
  );

  it("maps current families and pre-task-16 device stacks", () => {
    expect(serverFontFor("'Giftified Sans', sans-serif")).toBe(
      SERVER_FONTS.sans,
    );
    expect(serverFontFor("'Caveat', cursive")).toBe(SERVER_FONTS.handwritten);
    expect(serverFontFor("'Noto Nastaliq Urdu', serif")).toBe(
      SERVER_FONTS.urdu,
    );
    expect(serverFontFor("Arial, Helvetica, sans-serif")).toBe(
      SERVER_FONTS.sans,
    );
    expect(serverFontFor("Georgia, 'Times New Roman', serif")).toBe(
      SERVER_FONTS.serif,
    );
    expect(serverFontFor("'Courier New', Courier, monospace")).toBe(
      SERVER_FONTS.mono,
    );
    expect(serverFontFor("Comic Sans MS")).toBeNull();
  });

  it("ships every face's TTF on the server and the same file as WOFF2 in the browser", () => {
    const files = serverFontFiles();
    expect(files).toHaveLength(FONTS.reduce((n, f) => n + f.faces.length, 0));
    for (const f of files) {
      expect(existsSync(f.path), f.path).toBe(true);
      expect(existsSync(path.join(path.dirname(f.path), "OFL.txt"))).toBe(true);
    }
    for (const font of FONTS) {
      for (const face of font.faces) {
        const woff2 = path.join(
          "public/fonts/print",
          font.dir,
          `${face.file}.woff2`,
        );
        expect(existsSync(woff2), woff2).toBe(true);
      }
      expect(
        existsSync(path.join("public/fonts/print", font.dir, "OFL.txt")),
      ).toBe(true);
    }
  });

  it("registers no fake faces (no upright copy in a bold/italic slot)", () => {
    const hashes = serverFontFiles().map((f) =>
      createHash("md5").update(readFileSync(f.path)).digest("hex"),
    );
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("node-canvas really uses the bundled fonts (no silent system fallback)", () => {
    // Liberation Sans Bold has Arial Bold's advance widths: 7.723 em for this string.
    expect(measure(`bold 100px '${SERVER_FONTS.sans.family}'`)).toBeCloseTo(
      772.3,
      0,
    );
    // Liberation Mono: every glyph is 0.6 em.
    expect(
      measure(`100px '${SERVER_FONTS.mono.family}'`, "abcdefghij"),
    ).toBeCloseTo(600, 0);
    for (const [key, font] of Object.entries(SERVER_FONTS)) {
      // Urdu is subset to the Arabic block only (no Latin glyphs, keeping the
      // browser payload under budget — see src/config/fonts.ts), so it needs
      // Urdu text to prove it's really registered.
      const text = key === "urdu" ? "سلام" : undefined;
      const fallback = measure("100px 'No Such Font Anywhere'", text);
      expect(measure(`100px '${font.family}'`, text)).not.toBeCloseTo(
        fallback,
        0,
      );
    }
  });
});
