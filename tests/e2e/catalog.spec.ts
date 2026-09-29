import { expect, test, type Page } from "@playwright/test";

async function noSideScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(360);
}

test("catalog → mug page → Design your own opens the editor", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Design your own gift",
  );
  await noSideScroll(page);

  // T-shirt and hoodie have no print config yet: "Coming soon", not links.
  for (const id of ["tshirt", "hoodie"]) {
    const card = page.getByTestId(`product-card-${id}`);
    await expect(card).toContainText("Coming soon");
    await expect(card).not.toHaveAttribute("href");
  }

  await page.getByTestId("product-card-mug").tap();
  await expect(page).toHaveURL(/\/products\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Custom Mug",
  );
  await expect(page.getByText("Cash on Delivery").first()).toBeVisible();
  await noSideScroll(page);

  // The first card on the page is always "Design your own".
  const first = page.locator("main section").first();
  await expect(first).toHaveAttribute("data-testid", "design-your-own");
  await expect(first.getByRole("heading")).toHaveText("Design your own");
  // Gallery slot (task 19): "coming soon" until a template is published.
  await expect(page.locator("#designs")).toContainText("Ready-made designs");

  await first.getByRole("link", { name: "Start designing" }).tap();
  await expect(page).toHaveURL(/\/design\/mug$/);
  await expect(page.getByTestId("editor-status")).toBeAttached();
});

test("delivery estimate: Lahore costs Rs 200 and the city is remembered", async ({
  page,
}) => {
  await page.goto("/products/mug");
  await page.getByText("Details", { exact: true }).tap();
  await expect(page.getByText(/228 × 89 mm · printed at/)).toBeVisible();

  const city = page.getByLabel("Delivery estimate — your city");
  await city.fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await expect(page.locator("#delivery-result")).toHaveText(
    "Delivery to Lahore: Rs 200 · pay cash when it arrives",
  );
  await noSideScroll(page);

  await page.reload();
  await page.getByText("Details", { exact: true }).tap();
  await expect(city).toHaveValue("Lahore");
  await expect(page.locator("#delivery-result")).toContainText("Rs 200");
});

// Not-found is streamed after loading.tsx, so Next sends it as a "soft 404"
// (status 200 + noindex) — see node_modules/next/dist/docs loading.md "Status Codes".
test("no page for products that can't be designed yet, or unknown slugs", async ({
  page,
}) => {
  for (const path of ["/products/tshirt", "/products/nope"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We can’t find that page" }),
    ).toBeVisible();
    expect(
      await page.locator('meta[name="robots"][content*="noindex"]').count(),
    ).toBeGreaterThan(0);
    await expect(page.getByTestId("design-your-own")).toHaveCount(0);
  }
});
