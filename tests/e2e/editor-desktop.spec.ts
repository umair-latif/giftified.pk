import { expect, test } from "@playwright/test";
import { openEditorWithText } from "./helpers";

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
  await expect(tools).toHaveCSS("position", "static");
  await expect(selection).toBeVisible();
  await expect(selection).toHaveCSS("position", "static");
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
});
