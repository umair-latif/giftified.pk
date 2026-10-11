import { describe, expect, it } from "vitest";
import type { TextStyle } from "@/features/editor/engine/text-style";
import {
  faceToggles,
  textStyleChanges,
  withRealFace,
} from "@/features/editor/text-faces";

const base: TextStyle = {
  text: "Your text",
  fontFamily: "'Giftified Sans', sans-serif",
  fill: "#111827",
  fontWeight: "bold",
  fontStyle: "italic",
  underline: false,
  textAlign: "center",
  stroke: null,
  strokeWidthMm: 0,
};

describe("text editor helpers", () => {
  it("offers bold/italic only where the font has the face", () => {
    expect(faceToggles(base)).toEqual({ canBold: true, canItalic: true });
    const urdu = { ...base, fontFamily: "'Giftified Nastaliq', serif" };
    expect(faceToggles(withRealFace(urdu, {}))).toEqual({
      canBold: false,
      canItalic: false,
    });
  });

  it("switching to a font without italic drops it (the print can't fake it)", () => {
    const next = withRealFace(base, {
      fontFamily: "'Giftified Caveat', cursive",
    });
    expect(next.fontStyle).toBe("normal");
  });

  it("Done applies only what changed", () => {
    expect(textStyleChanges(base, base)).toEqual({});
    expect(
      textStyleChanges(base, {
        ...base,
        text: "Eid Mubarak",
        strokeWidthMm: 0.4,
        stroke: "#ffffff",
      }),
    ).toEqual({ text: "Eid Mubarak", strokeWidthMm: 0.4, stroke: "#ffffff" });
  });
});
