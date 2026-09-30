import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_TEXT_FONT } from "@/config/fonts";
import { fitTextWidth, isAutoWidth } from "@/features/editor/engine/text-fit";
import {
  registerServerFonts,
  serverFontFor,
} from "@/server/print/server-fonts";

vi.mock("server-only", () => ({}));

let Textbox: typeof import("fabric/node").Textbox;
let family: string;

beforeAll(async () => {
  await registerServerFonts();
  ({ Textbox } = await import("fabric/node"));
  family = `'${serverFontFor(DEFAULT_TEXT_FONT.family)!.family}'`;
});

const box = (text: string, extra: Record<string, unknown> = {}) =>
  new Textbox(text, {
    width: 137, // the old fixed 60 % of a 228 mm print area
    fontSize: 17.8,
    fontFamily: family,
    fontWeight: "bold",
    textAlign: "center",
    ...extra,
  });
const widest = (tb: InstanceType<typeof Textbox>) =>
  Math.max(...tb.textLines.map((_, i) => tb.getLineWidth(i)));

describe("auto-width text", () => {
  it("a short text is as wide as the text, not the old fixed box", () => {
    const tb = box("Hi");
    fitTextWidth(tb, 228);
    expect(tb.width).toBeLessThan(40);
    expect(tb.width).toBeGreaterThanOrEqual(widest(tb)); // never narrower than its widest line
    expect(tb.textLines).toEqual(["Hi"]); // still one line
  });

  it("grows with the text and stays on one line while it fits", () => {
    const a = box("Happy");
    const b = box("Happy Birthday");
    fitTextWidth(a, 228);
    fitTextWidth(b, 228);
    expect(b.width).toBeGreaterThan(a.width);
    expect(b.textLines).toHaveLength(1);
  });

  it("wraps only at the print-area edge", () => {
    const tb = box(
      "Happy Birthday to the very best friend anyone could ever ask for",
    );
    fitTextWidth(tb, 228);
    expect(tb.width).toBeLessThanOrEqual(228);
    expect(tb.width).toBeGreaterThan(200); // used (nearly) all the room
    expect(tb.textLines.length).toBeGreaterThan(1);
  });

  it("keeps explicit line breaks and fits the widest line", () => {
    const tb = box("Happy\nBirthday");
    fitTextWidth(tb, 228);
    expect(tb.textLines).toEqual(["Happy", "Birthday"]);
    expect(tb.width).toBeGreaterThanOrEqual(widest(tb));
  });

  it("respects a scaled box: the limit is the print area, not the local width", () => {
    const tb = box(
      "Happy Birthday to the very best friend anyone could ever ask for",
      { scaleX: 2, scaleY: 2 },
    );
    fitTextWidth(tb, 228);
    expect(tb.width * 2).toBeLessThanOrEqual(228 + 0.001);
  });

  it("only text flagged autoWidth is managed (older text keeps its saved width)", () => {
    expect(isAutoWidth(box("x"))).toBe(false);
    expect(isAutoWidth(box("x", { autoWidth: true }))).toBe(true);
  });
});
