import { describe, expect, it } from "vitest";
import { FONTS } from "@/config/fonts";
import { previewText } from "@/features/editor/components/font-picker";

const font = (id: string) => FONTS.find((f) => f.id === id)!;

describe("previewText", () => {
  it("shows the first non-empty line of the customer's text", () => {
    expect(previewText(font("sans"), "\n  Happy Eid, Ammi \nlove, Ali")).toBe(
      "Happy Eid, Ammi",
    );
  });
  it("cuts long text with an ellipsis", () => {
    const long = "Happy birthday to the best brother in the world";
    const out = previewText(font("serif"), long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(29);
  });
  it("falls back to a sample when the text is empty", () => {
    expect(previewText(font("elegant"), "  ")).toBe("Your text");
  });
  it("Urdu shows a sample until the text has Urdu letters", () => {
    expect(previewText(font("urdu"), "Ali")).toBe("اردو میں لکھیں");
    expect(previewText(font("urdu"), "عید مبارک")).toBe("عید مبارک");
    for (const id of ["urdu-naskh", "urdu-kufi"]) {
      expect(previewText(font(id), "Ali")).toBe("اردو میں لکھیں");
      expect(previewText(font(id), "سالگرہ مبارک")).toBe("سالگرہ مبارک");
    }
  });
  it("Latin scripts show the customer's text as typed", () => {
    expect(previewText(font("signature"), "Ayesha")).toBe("Ayesha");
    expect(previewText(font("brush"), "Ayesha")).toBe("Ayesha");
  });
});
