import { expect, test } from "@playwright/test";

test("phone: the menu opens under the header, links work, and it closes on a new page", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.getByTestId("menu-button");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.tap();
  const menu = page.getByTestId("mobile-menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Products" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Eid" })).toHaveAttribute(
    "href",
    "/occasions/eid",
  );
  await menu.getByRole("link", { name: "Help & FAQ" }).tap();
  await expect(page).toHaveURL(/\/help$/);
  await expect(menu).toBeHidden();
  // Escape closes it too.
  await button.tap();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("desktop: no burger, the links sit in the header", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("menu-button")).toBeHidden();
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Products" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Help" })).toBeVisible();
});

test("product page: ready-made designs sit on the yellow shelf", async ({
  page,
}) => {
  await page.goto("/products/mug");
  await expect(page.getByTestId("product-designs")).toBeVisible();
  await expect(page.locator("#designs")).toContainText("Ready-made designs");
});
