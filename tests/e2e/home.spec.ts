import { expect, test } from "@playwright/test";

test("home page: hero, products, sections, no horizontal scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your photo, your words — on a mug, tee or hoodie",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Pay cash on delivery across Pakistan"),
  ).toBeVisible();

  const start = page.getByRole("link", { name: "Start designing" });
  await expect(start).toHaveAttribute("href", "/products");

  const mug = page.getByTestId("home-product-mug");
  await expect(mug.getByRole("link")).toHaveAttribute("href", "/products/mug");

  const tshirt = page.getByTestId("home-product-tshirt");
  await expect(tshirt.getByText("Coming soon")).toBeVisible();
  await expect(tshirt.getByRole("link")).toHaveCount(0);
  await expect(
    page.getByTestId("home-product-hoodie").getByText("Coming soon"),
  ).toBeVisible();

  for (const name of [
    "How it works",
    "Gifts for every occasion",
    "Why Giftified",
  ])
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Eid", exact: true }),
  ).toHaveAttribute("href", "/products");

  // Scroll to the bottom so lazy images load, then check the width.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);
});

test("Start designing goes to /products", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start designing" }).tap();
  await expect(page).toHaveURL(/\/products$/);
});
