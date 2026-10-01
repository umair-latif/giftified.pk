import { expect, test } from "@playwright/test";

test("t-shirt configuration opens a portrait editor and preserves its draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/products/tshirt");
  await page.getByRole("link", { name: "Start designing" }).tap();
  await expect(page).toHaveURL(/\/design\/tshirt$/);
  const guide = page.getByTestId("garment-guide");
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute(
    "src",
    "/mockups/tshirt-editor-front.webp",
  );
  await expect(guide).toHaveCSS("opacity", "0.25");
  await expect(guide).toHaveCSS("pointer-events", "none");
  const status = page.getByTestId("editor-status");
  await expect(status).toContainText("0 layers");
  await page.getByRole("button", { name: "Text", exact: true }).tap();
  await expect(status).toContainText("textbox");
  const host = page.getByTestId("canvas-host");
  const bounds = await host.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width / bounds!.height).toBeCloseTo(300 / 400, 2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.reload();
  await expect(status).toContainText("1 layer");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  await expect(page.getByTestId("preview-layers")).toHaveText("1");
  await expect(page.getByText("300 × 400 mm · 300 DPI")).toBeVisible();
  expect(errors).toEqual([]);
});
