import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { textLayouts } from "@/features/editor/engine/text-layout";
import { preparePrintJson } from "@/server/print/render";
import { registerServerFonts } from "@/server/print/server-fonts";
import {
  layoutDiffs,
  maxWidthDelta,
  parityDesign,
  PARITY_CASES,
  type ExpectedLayouts,
  type MeasuredLayout,
} from "../fixtures/font-parity";

vi.mock("server-only", () => ({}));

/**
 * Task 16 acceptance test, server half: the print renderer's canvas (fabric in
 * Node, fonts registered with node-canvas, JSON prepared exactly as for a
 * print) lays out each font × face sample like the browser editor did —
 * `font-parity-expected.json` is recorded from the browser by
 * `tests/e2e/font-parity.spec.ts`. Line breaks identical, widths ≤ 1%.
 */
const expected = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "tests/fixtures/font-parity-expected.json"),
    "utf8",
  ),
) as ExpectedLayouts;

let server: Map<string, MeasuredLayout>;

beforeAll(async () => {
  await registerServerFonts();
  const { StaticCanvas } = await import("fabric/node");
  const canvas = new StaticCanvas(undefined, { width: 10, height: 10 });
  try {
    await canvas.loadFromJSON(preparePrintJson(parityDesign().fabric).json);
    const layouts = textLayouts(canvas.getObjects());
    server = new Map(
      PARITY_CASES.map((c, i) => {
        const l = layouts[i]!;
        return [
          c.key,
          { lines: l.lines, lineWidths: l.lineWidths, height: l.height },
        ];
      }),
    );
  } finally {
    await canvas.dispose();
  }
});

describe("editor ↔ print font parity (server side)", () => {
  it("has a browser recording for every font × face", () => {
    expect(Object.keys(expected).sort()).toEqual(
      PARITY_CASES.map((c) => c.key).sort(),
    );
  });

  it.each(PARITY_CASES.map((c) => [c.key, c] as const))(
    "%s: same line breaks, widths within 1%",
    (key) => {
      const a = server.get(key)!;
      const e = expected[key]!;
      expect(a.lines.length).toBeGreaterThan(1); // the sample really wraps
      expect(layoutDiffs(a, e)).toEqual([]);
      expect(maxWidthDelta(a, e)).toBeLessThan(0.01);
    },
  );
});
