import { describe, expect, it } from "vitest";
import { FONTS, fitFace, fontForFamily } from "@/config/fonts";
import {
  designFontFaces,
  migrateDesignFonts,
} from "@/features/editor/fonts/migrate";

const family = (id: string) => FONTS.find((f) => f.id === id)!.family;

const text = (o: Record<string, unknown>) => ({
  type: "Textbox",
  text: "Hi",
  fontWeight: "normal",
  fontStyle: "normal",
  ...o,
});

describe("font migration (pre-task-16 device stacks → self-hosted families)", () => {
  it.each([
    ["Arial, Helvetica, sans-serif", "sans"],
    ["Georgia, 'Times New Roman', serif", "serif"],
    ["'Courier New', Courier, monospace", "mono"],
    ["'Poppins', Arial, sans-serif", "playful"],
    ["'Playfair Display', Georgia, serif", "elegant"],
    ["'Caveat', cursive", "handwritten"],
    ["'Noto Nastaliq Urdu', serif", "urdu"],
  ])("%s → %s", (old, id) => {
    const out = migrateDesignFonts({ objects: [text({ fontFamily: old })] });
    expect((out.objects as Record<string, unknown>[])[0]!.fontFamily).toBe(
      family(id),
    );
  });

  it("keeps current families and unknown fonts as they are", () => {
    const out = migrateDesignFonts({
      objects: [
        text({ fontFamily: family("elegant") }),
        text({ fontFamily: "Comic Sans MS" }),
      ],
    });
    const objs = out.objects as Record<string, unknown>[];
    expect(objs[0]!.fontFamily).toBe(family("elegant"));
    expect(objs[1]!.fontFamily).toBe("Comic Sans MS");
  });

  it("drops styles a font has no real face for, and normalises weights", () => {
    const out = migrateDesignFonts({
      objects: [
        text({
          fontFamily: "'Caveat', cursive",
          fontWeight: "bold",
          fontStyle: "italic",
        }),
        text({
          fontFamily: "'Noto Nastaliq Urdu', serif",
          fontWeight: 700,
          fontStyle: "italic",
        }),
        text({ fontFamily: "Arial", fontWeight: "600", fontStyle: "italic" }),
      ],
    });
    const objs = out.objects as Record<string, unknown>[];
    expect(objs[0]).toMatchObject({ fontWeight: "bold", fontStyle: "normal" });
    expect(objs[1]).toMatchObject({
      fontWeight: "normal",
      fontStyle: "normal",
    });
    expect(objs[2]).toMatchObject({ fontWeight: "bold", fontStyle: "italic" });
  });

  it("migrates groups and per-character styles; never mutates the input", () => {
    const input = {
      objects: [
        {
          type: "Group",
          objects: [
            text({
              fontFamily: "Georgia, serif",
              styles: [
                {
                  start: 0,
                  end: 1,
                  style: {
                    fontFamily: "'Courier New', monospace",
                    fontStyle: "italic",
                  },
                },
                { start: 1, end: 2, style: { fontStyle: "italic" } },
              ],
            }),
          ],
        },
      ],
    };
    const before = JSON.stringify(input);
    const out = migrateDesignFonts(input);
    expect(JSON.stringify(input)).toBe(before);
    const inner = (
      (out.objects as Record<string, unknown>[])[0]!.objects as Record<
        string,
        unknown
      >[]
    )[0]!;
    expect(inner.fontFamily).toBe(family("serif"));
    expect(inner.styles).toEqual([
      {
        start: 0,
        end: 1,
        style: { fontFamily: family("mono"), fontStyle: "italic" },
      },
      { start: 1, end: 2, style: { fontStyle: "italic" } },
    ]);
  });

  it("is idempotent", () => {
    const once = migrateDesignFonts({
      objects: [text({ fontFamily: "'Caveat', cursive", fontStyle: "italic" })],
    });
    expect(migrateDesignFonts(once)).toEqual(once);
  });
});

describe("designFontFaces", () => {
  it("lists each face a design uses once, including per-character styles", () => {
    const faces = designFontFaces(
      migrateDesignFonts({
        objects: [
          text({ fontFamily: "Arial", fontWeight: "bold" }),
          text({ fontFamily: "Arial", fontWeight: "bold" }),
          text({
            fontFamily: "'Poppins', Arial",
            styles: [{ start: 0, end: 1, style: { fontStyle: "italic" } }],
          }),
          text({ fontFamily: "Comic Sans MS" }),
          { type: "Image", src: "asset:x" },
        ],
      }),
    );
    expect(
      faces.map((f) => `${f.font.id}/${f.weight}/${f.style}`).sort(),
    ).toEqual([
      "playful/normal/italic",
      "playful/normal/normal",
      "sans/bold/normal",
    ]);
  });
});

describe("fitFace / fontForFamily", () => {
  it("prefers dropping italic before bold", () => {
    const caveat = fontForFamily("'Giftified Caveat', cursive")!;
    expect(fitFace(caveat, "bold", "italic")).toEqual({
      weight: "bold",
      style: "normal",
    });
  });
  it("every font has a regular face", () => {
    for (const f of FONTS)
      expect(fitFace(f, "normal", "normal")).toEqual({
        weight: "normal",
        style: "normal",
      });
  });
});
