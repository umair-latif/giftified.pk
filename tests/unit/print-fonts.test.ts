import { existsSync } from "node:fs";
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

  it("maps the editor stacks to the metric-compatible fonts", () => {
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

  it("ships every font file (regular, bold, italic, bold italic)", () => {
    const files = serverFontFiles();
    expect(files).toHaveLength(Object.keys(SERVER_FONTS).length * 4);
    for (const f of files) expect(existsSync(f.path), f.path).toBe(true);
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
