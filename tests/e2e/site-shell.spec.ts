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
  // Phones: Track sits in the menu and the footer (not the header).
  await expect(
    page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Track your order" }),
  ).toBeVisible();
  const info = page.getByRole("contentinfo");
  await expect(info).toContainText("Kuch khaas banao");
  await expect(info.getByTestId("made-in")).toContainText("Made with");
  await expect(info.getByRole("img", { name: "Pakistan" })).toBeVisible();
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

test("an unknown address shows the shop shell with ways forward", async ({
  page,
}) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "We can’t find that page" }),
  ).toBeVisible();
  await expect(page.getByTestId("cart-link")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Footer" })).toBeVisible();
  await page.getByRole("link", { name: "See products" }).tap();
  await expect(page).toHaveURL(/\/products$/);
});

test("cart and checkout show the flow steps with Order as the current step", async ({
  page,
}) => {
  for (const path of ["/cart", "/checkout"]) {
    await page.goto(path);
    const steps = page.getByRole("list", { name: "Order steps" });
    await expect(steps).toBeVisible();
    await expect(steps.getByRole("listitem")).toHaveText([
      /Design/,
      /Preview/,
      /Order/,
    ]);
    await expect(steps.locator('[aria-current="step"]')).toHaveText(/Order/);
  }
});
