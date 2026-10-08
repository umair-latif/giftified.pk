import { expect, test } from "@playwright/test";

test("hoodie: chest print area above the pocket, size needed, grey hoodie in the cart", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/products/hoodie");
  await page.getByRole("link", { name: "Start designing" }).tap();
  await expect(page).toHaveURL(/\/design\/hoodie$/);
  await expect(page.getByTestId("pocket-guide")).toBeVisible();
  // One colour only: no colour picker.
  await expect(page.getByTestId("colour-picker")).toHaveCount(0);
  const host = page.getByTestId("canvas-host");
  const bounds = await host.boundingBox();
  expect(bounds!.width / bounds!.height).toBeCloseTo(280 / 300, 2);
  await page.getByRole("button", { name: "Text", exact: true }).tap();
  await expect(page.getByTestId("editor-status")).toContainText("textbox");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  await expect(page.getByText("280 × 300 mm · 300 DPI")).toBeVisible();
  const add = page
    .getByRole("button", { name: "Add to cart" })
    .filter({ visible: true })
    .first();
  await expect(add).toBeDisabled();
  await page.getByTestId("size-L").tap();
  await add.tap();
  await expect(page).toHaveURL(/\/cart$/);
  const line = page.getByTestId("cart-line");
  await expect(line).toContainText("Hoodie");
  await expect(line).toContainText("Grey");
  await expect(line).toContainText("L");
  expect(errors).toEqual([]);
});
