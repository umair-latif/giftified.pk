import { expect, test } from "@playwright/test";

test("home page: hero, products, sections, no horizontal scroll", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Design it yourself. See it before you buy.",
    }),
  ).toBeVisible();
  const steps = page.getByTestId("hero-steps").getByRole("listitem");
  await expect(steps).toHaveText([/Design/, /Preview/, /Order/]);
  await expect(page).toHaveTitle(/Kuch khaas banao/);
  await expect(page.getByRole("contentinfo")).toContainText("Kuch khaas banao");

  const start = page.getByRole("link", { name: "Start designing" });
  await expect(start).toHaveAttribute("href", "/products");

  const mug = page.getByTestId("home-product-mug");
  await expect(mug.getByRole("link")).toHaveAttribute("href", "/products/mug");

  const tshirt = page.getByTestId("home-product-tshirt");
  await expect(tshirt.getByRole("link")).toHaveAttribute(
    "href",
    "/products/tshirt",
  );
  await expect(
    page.getByTestId("home-product-hoodie").getByText("Coming soon"),
  ).toBeVisible();

  for (const name of [
    "How it works",
    "Gifts for every occasion",
    "Why DesignBanana",
  ])
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Eid", exact: true }),
  ).toHaveAttribute("href", "/occasions/eid");

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

test("how it works: no 3D promise; ready-made designs, easy customising and instant preview", async ({
  page,
}) => {
  await page.goto("/");
  const how = page.getByRole("region", { name: "How it works" });
  await expect(how).toBeVisible();
  await expect(how).not.toContainText("3D");
  await expect(how).toContainText("ready-made design");
  await expect(how).toContainText("everyday scenes");
  await expect(page.getByText(/on your phone/)).toHaveCount(0);
  await expect(page.getByTestId("home-template")).toHaveCount(0); // none yet
});

test("occasion tiles: no column is a single colour on a phone", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page
    .getByRole("region", { name: "Gifts for every occasion" })
    .getByRole("link");
  const colours = await tiles.evaluateAll((els) =>
    els.map((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      x: Math.round(el.getBoundingClientRect().left),
    })),
  );
  expect(colours).toHaveLength(7);
  const byColumn = new Map<number, Set<string>>();
  for (const { bg, x } of colours)
    byColumn.set(x, (byColumn.get(x) ?? new Set()).add(bg));
  for (const set of byColumn.values()) expect(set.size).toBe(2);
});
