import { expect, test } from "@playwright/test";
import {
  AREA,
  canvasBox,
  openEditorWithText,
  readout,
  status,
} from "./helpers";

test("new text is as wide as the text, and grows as you type", async ({
  page,
}) => {
  await openEditorWithText(page);
  const start = await readout(page);
  // Not the old fixed box (60 % of the print area).
  expect(start.w).toBeLessThan(AREA.widthMm * 0.5);

  // Type into the text on the canvas: the box follows the text.
  const { cx, cy } = await canvasBox(page);
  await page.mouse.dblclick(cx, cy);
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Happy Birthday to you");
  await expect
    .poll(async () => (await readout(page)).w)
    .toBeGreaterThan(start.w);
  const typed = await readout(page);
  expect(typed.w).toBeLessThanOrEqual(AREA.widthMm);

  // A very long line wraps at the edge of the print area, not beyond it.
  await page.keyboard.type(
    " and many many happy returns of the day my dear friend",
  );
  await expect
    .poll(async () => (await readout(page)).w)
    .toBeGreaterThan(AREA.widthMm * 0.85);
  expect((await readout(page)).w).toBeLessThanOrEqual(AREA.widthMm);
  await expect(status(page)).toContainText("textbox");
});

test("changing the words in the sheet re-fits the box", async ({ page }) => {
  await openEditorWithText(page);
  const before = await readout(page);
  await page
    .getByTestId("selection-bar")
    .getByRole("button", { name: "More" })
    .click();
  await page.getByTestId("text-sheet-input").fill("Happy Anniversary");
  await page.getByTestId("text-sheet-input").blur();
  await expect
    .poll(async () => (await readout(page)).w)
    .toBeGreaterThan(before.w);
});
