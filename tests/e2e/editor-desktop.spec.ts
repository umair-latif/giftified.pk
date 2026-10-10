import { expect, test } from "@playwright/test";
import { canvasBox, openEditorWithText } from "./helpers";

// Desktop: canvas on the left, tools in a panel on the right (no fixed bottom bars).
test.use({
  viewport: { width: 1280, height: 800 },
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 1,
});

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("tools sit in a side panel next to a larger canvas", async ({ page }) => {
  await openEditorWithText(page);
  const canvas = await page.getByTestId("canvas-host").boundingBox();
  const tools = page.getByRole("navigation", { name: "Editor tools" });
  const toolsBox = await tools.boundingBox();
  const selection = page.getByTestId("selection-bar");
  const selBox = await selection.boundingBox();

  expect(canvas!.width).toBeGreaterThan(560); // 328 px on a phone
  // The panel is beside the canvas, not fixed to the bottom of the screen.
  expect(toolsBox!.x).toBeGreaterThan(canvas!.x + canvas!.width);
  expect(toolsBox!.y + toolsBox!.height).toBeLessThan(700);
  await expect(tools).not.toHaveCSS("position", "fixed");
  await expect(selection).toBeVisible();
  await expect(selection).not.toHaveCSS("position", "fixed");
  expect(selBox!.x).toBeGreaterThan(canvas!.x + canvas!.width);

  // Header spans the same column as the content.
  const header = await page
    .getByRole("banner")
    .locator("div")
    .first()
    .boundingBox();
  expect(header!.width).toBeGreaterThan(900);

  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(page).toHaveURL(/\/design\/mug\/preview$/);
  await expect(page.getByTestId("preview-gallery")).toBeVisible();
  const gallery = await page.getByTestId("preview-gallery").boundingBox();
  const details = await page.getByText("Print size").boundingBox();
  expect(details!.x).toBeGreaterThan(gallery!.x + gallery!.width);
  // Thumbnails are a strip on the left of a smaller main image.
  const thumb = await page.getByTestId("preview-thumb-left").boundingBox();
  const main = await page.getByTestId("preview-mockup").boundingBox();
  expect(thumb!.x + thumb!.width).toBeLessThanOrEqual(main!.x + 1);
  expect(main!.width).toBeLessThan(560);
  // Add to cart sits in the right column under the details, not in a bottom bar.
  const add = await page
    .getByRole("button", { name: "Add to cart" })
    .boundingBox();
  expect(add!.x).toBeGreaterThan(gallery!.x + gallery!.width);
  expect(add!.y).toBeGreaterThan(details!.y);
});

test("double click on a text selects all of it (not just one word)", async ({
  page,
}) => {
  await openEditorWithText(page);
  const { cx, cy } = await canvasBox(page);
  await page.mouse.dblclick(cx, cy);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLTextAreaElement | null;
        return el?.tagName === "TEXTAREA"
          ? [el.selectionStart, el.selectionEnd]
          : null;
      }),
    )
    .toEqual([0, 9]);
});
