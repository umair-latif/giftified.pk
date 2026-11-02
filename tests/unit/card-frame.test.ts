import { describe, expect, it } from "vitest";
import {
  CARD,
  CARD_OUTER,
  cardSuitOf,
  normaliseCardLetter,
} from "@/features/editor/engine/card-frame";
import { FRAME_SHAPE_INFO } from "@/features/editor/engine/frame-shape";
import { designFontFaces } from "@/features/editor/fonts/migrate";

describe("playing-card frame", () => {
  it("keeps the letter to two capitals or digits", () => {
    expect(normaliseCardLetter("k")).toBe("K");
    expect(normaliseCardLetter("10")).toBe("10");
    expect(normaliseCardLetter(" a.b-c ")).toBe("AB");
    expect(normaliseCardLetter("ق")).toBe("");
    expect(normaliseCardLetter(undefined)).toBe("");
    expect(normaliseCardLetter(7)).toBe("");
  });

  it("knows its suits and keeps the photo window's proportions", () => {
    expect(cardSuitOf("card-heart")).toBe("heart");
    expect(cardSuitOf("card-diamond")).toBe("diamond");
    expect(cardSuitOf("heart")).toBeNull();
    expect(FRAME_SHAPE_INFO["card-heart"].aspect).toBeCloseTo(463 / 834);
    // The card is about 1.65 × the photo wide and 1.29 × as tall.
    expect(CARD_OUTER.w).toBeCloseTo(764 / 463);
    expect(CARD_OUTER.h).toBeCloseTo(1078 / 834);
  });

  it("asks for the serif bold face whenever a card frame is used", () => {
    const faces = designFontFaces({
      objects: [
        { type: "Image", frameShape: "card-diamond", frameLetter: "Q" },
      ],
    });
    expect(faces).toHaveLength(1);
    expect(faces[0]!.font.name).toBe(CARD.font.family);
    expect([faces[0]!.weight, faces[0]!.style]).toEqual(["bold", "normal"]);
    expect(designFontFaces({ objects: [{ type: "Image" }] })).toEqual([]);
  });
});
