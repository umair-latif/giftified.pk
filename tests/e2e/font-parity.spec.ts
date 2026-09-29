import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  layoutDiffs,
  maxWidthDelta,
  parityDesign,
  PARITY_CASES,
  type ExpectedLayouts,
  type MeasuredLayout,
} from "../fixtures/font-parity";
import { status } from "./helpers";

/**
 * Task 16 acceptance test, browser half: the REAL editor restores a draft
 * with one text box per font × real face and lays it out with the self-hosted
 * print fonts. Line breaks must equal, and widths/heights be within 1% of,
 * `tests/fixtures/font-parity-expected.json` — the same file the server half
 * (`tests/unit/font-parity.test.ts`, the print renderer) is checked against.
 * Re-record after changing fonts: `UPDATE_FONT_PARITY=1 pnpm e2e font-parity`.
 */
const EXPECTED = join(
  process.cwd(),
  "tests/fixtures/font-parity-expected.json",
);

interface ProbeLayout extends MeasuredLayout {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
}

async function seedDraft(page: Page, doc: unknown) {
  await page.addInitScript((d) => {
    (window as unknown as { __GIFTIFIED_E2E__: boolean }).__GIFTIFIED_E2E__ =
      true;
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("giftified:draft:mug", JSON.stringify(d));
      sessionStorage.setItem("seeded", "1");
    }
  }, doc);
}

async function textLayouts(page: Page): Promise<ProbeLayout[]> {
  await page.waitForFunction(
    () => "__giftifiedTextLayout" in (window as object),
  );
  return page.evaluate(() =>
    (
      window as unknown as { __giftifiedTextLayout: () => ProbeLayout[] }
    ).__giftifiedTextLayout(),
  );
}

function fontRequests(page: Page) {
  const urls: string[] = [];
  page.on("request", (r) => {
    const m = r.url().match(/\/fonts\/print\/(.+)$/);
    if (m?.[1]) urls.push(m[1]);
  });
  return urls;
}

test("every font × face: editor text layout matches the print renderer", async ({
  page,
}) => {
  const doc = parityDesign();
  await seedDraft(page, doc);
  const requested = fontRequests(page);
  await page.goto("/design/mug");
  await expect(status(page)).toHaveText(
    new RegExp(`${PARITY_CASES.length} layers`),
  );
  // Every face was fetched and is active before we measure.
  await expect.poll(() => new Set(requested).size).toBe(PARITY_CASES.length);
  await page.evaluate(() => document.fonts.ready);
  const layouts = await textLayouts(page);
  expect(layouts).toHaveLength(PARITY_CASES.length);

  const measured: ExpectedLayouts = {};
  PARITY_CASES.forEach((c, i) => {
    const l = layouts[i]!;
    expect(l.fontFamily).toBe(c.family);
    expect([l.fontWeight, l.fontStyle]).toEqual([c.weight, c.style]);
    measured[c.key] = {
      lines: l.lines,
      lineWidths: l.lineWidths.map((w) => +w.toFixed(4)),
      height: +l.height.toFixed(4),
    };
  });

  if (process.env.UPDATE_FONT_PARITY) {
    writeFileSync(EXPECTED, JSON.stringify(measured, null, 2) + "\n");
    return;
  }
  const expected = JSON.parse(
    readFileSync(EXPECTED, "utf8"),
  ) as ExpectedLayouts;
  const failures: Record<string, string[]> = {};
  const table: string[] = [];
  for (const c of PARITY_CASES) {
    const e = expected[c.key];
    const a = measured[c.key]!;
    const diffs = e ? layoutDiffs(a, e) : ["no expected layout recorded"];
    if (diffs.length) failures[c.key] = diffs;
    if (e)
      table.push(
        `${c.key.padEnd(24)} ${a.lines.length} lines, max Δwidth ${(maxWidthDelta(a, e) * 100).toFixed(3)}%`,
      );
  }
  console.log(`[font-parity] browser vs expected\n${table.join("\n")}`);
  expect(failures).toEqual({});
});

test("an old draft (device-font stack) is migrated and only its font is fetched", async ({
  page,
}) => {
  const design = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  ) as { fabric: { objects: { fontFamily?: string }[] } };
  expect(design.fabric.objects[0]!.fontFamily).toBe(
    "Arial, Helvetica, sans-serif",
  );
  await seedDraft(page, design);
  const requested = fontRequests(page);
  await page.goto("/design/mug");
  const [layout] = await textLayouts(page);
  expect(layout!.fontFamily).toBe("'Giftified Sans', sans-serif");
  // Exactly its two faces (bold is also the default for new text).
  expect([...new Set(requested)].sort()).toEqual([
    "liberation/LiberationSans-Bold.woff2",
    "liberation/LiberationSans-BoldItalic.woff2",
  ]);
});

test("the Preview step waits for the design's fonts before rendering", async ({
  page,
}) => {
  const doc = parityDesign();
  const urdu = PARITY_CASES.findIndex((c) => c.fontId === "urdu");
  doc.fabric.objects = [(doc.fabric.objects as unknown[])[urdu]];
  await seedDraft(page, doc);
  const requested = fontRequests(page);
  await page.goto("/design/mug/preview");
  await expect(page.getByAltText(/Your Custom Mug, front view/)).toBeVisible();
  expect(requested).toContain(
    "noto-nastaliq-urdu/NotoNastaliqUrdu-Regular.woff2",
  );
});

test("shop pages never load fonts", async ({ page }) => {
  const requested = fontRequests(page);
  await page.goto("/");
  await page.goto("/products");
  await page.waitForLoadState("networkidle");
  expect(requested).toEqual([]);
});
