/**
 * Shared samples for the editor ↔ print font-parity tests (task 16):
 * `tests/e2e/font-parity.spec.ts` (browser, the real editor) and
 * `tests/unit/font-parity.test.ts` (server, the real print renderer) lay out
 * the same text boxes and must agree with `font-parity-expected.json`
 * (recorded from the browser: `UPDATE_FONT_PARITY=1 pnpm e2e font-parity`).
 *
 * One Textbox per font × REAL face (see `src/config/fonts.ts`).
 */
import { FONTS, type FontStyle, type FontWeight } from "@/config/fonts";
import { mug } from "@/config/products/mug";
import type { DesignDocument } from "@/types/design";

export const LATIN_SAMPLE = "Happy Birthday Ayesha! 0123 Eid Mubarak";
export const URDU_SAMPLE = "سالگرہ مبارک عائشہ، عید مبارک ہو۔ ۰۱۲۳ خوش رہو";

/** Fixed box, in mm (scene units): narrow enough to wrap to 3–4 lines. */
export const BOX = { widthMm: 60, fontSizeMm: 7, lineHeight: 1.16 } as const;

/** Line breaks must match exactly; widths / heights within this fraction. */
export const TOLERANCE = 0.01;

export interface ParityCase {
  key: string;
  fontId: string;
  label: string;
  family: string;
  weight: FontWeight;
  style: FontStyle;
  text: string;
}

export const PARITY_CASES: ParityCase[] = FONTS.flatMap((font) =>
  font.faces.map((face) => ({
    key: `${font.id}/${face.weight}/${face.style}`,
    fontId: font.id,
    label: font.id === "urdu" ? "Urdu" : font.label,
    family: font.family,
    weight: face.weight,
    style: face.style,
    text: font.scripts.includes("arabic") ? URDU_SAMPLE : LATIN_SAMPLE,
  })),
);

/** Fabric JSON for one case's text box (what the editor would save). */
export function parityTextbox(c: ParityCase, i: number) {
  return {
    type: "Textbox",
    version: "7.4.0",
    originX: "left",
    originY: "top",
    left: 4 + (i % 3) * 70,
    top: 4,
    width: BOX.widthMm,
    fontSize: BOX.fontSizeMm,
    lineHeight: BOX.lineHeight,
    fontFamily: c.family,
    fontWeight: c.weight,
    fontStyle: c.style,
    text: c.text,
    textAlign: "left",
    fill: "#111827",
    styles: [],
  };
}

/** Every case in one mug design (the browser test restores it as a draft). */
export function parityDesign(): DesignDocument {
  return {
    schemaVersion: 1,
    productId: "mug",
    units: "mm",
    printArea: { ...mug.printArea },
    fabric: { version: "7.4.0", objects: PARITY_CASES.map(parityTextbox) },
  };
}

export interface MeasuredLayout {
  lines: string[];
  lineWidths: number[];
  height: number;
}

export type ExpectedLayouts = Record<string, MeasuredLayout>;

/** Human-readable differences between two layouts ([] = parity). */
export function layoutDiffs(
  actual: MeasuredLayout,
  expected: MeasuredLayout,
  tolerance = TOLERANCE,
): string[] {
  const diffs: string[] = [];
  if (JSON.stringify(actual.lines) !== JSON.stringify(expected.lines)) {
    diffs.push(
      `line breaks ${JSON.stringify(actual.lines)} ≠ ${JSON.stringify(expected.lines)}`,
    );
    return diffs;
  }
  actual.lineWidths.forEach((w, i) => {
    const e = expected.lineWidths[i] ?? 0;
    if (Math.abs(w - e) > tolerance * e)
      diffs.push(`line ${i + 1} width ${w.toFixed(3)} vs ${e.toFixed(3)} mm`);
  });
  if (Math.abs(actual.height - expected.height) > tolerance * expected.height)
    diffs.push(
      `height ${actual.height.toFixed(3)} vs ${expected.height.toFixed(3)} mm`,
    );
  return diffs;
}

/** Largest relative line-width difference (for the report table). */
export function maxWidthDelta(a: MeasuredLayout, b: MeasuredLayout): number {
  return Math.max(
    0,
    ...a.lineWidths.map((w, i) => {
      const e = b.lineWidths[i] ?? 0;
      return e ? Math.abs(w - e) / e : 1;
    }),
  );
}
