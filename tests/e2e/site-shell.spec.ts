import { expect, test } from "@playwright/test";

test("site header shows the cart count and the footer links", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "giftified:cart",
      JSON.stringify([
        {
          id: "a1",
          productId: "mug",
          colourId: "white",
          quantity: 2,
          designKey: "d1",
          addedAt: "2026-09-28T10:00:00.000Z",
        },
      ]),
    );
  });
  await page.goto("/");
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await expect(page.getByTestId("cart-link")).toHaveAttribute("href", "/cart");
  await expect(
    page.getByRole("link", { name: "Track your order" }).first(),
  ).toBeVisible();
  const footer = page.getByRole("navigation", { name: "Footer" });
  for (const name of ["Help & FAQ", "Contact", "Privacy", "Terms"])
    await expect(footer.getByRole("link", { name })).toBeVisible();
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);
});

test("an empty cart shows no badge", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("cart-link")).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveCount(0);
});
