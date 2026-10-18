import { expect, test, type Page } from "@playwright/test";

async function noSideScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(360);
}

test("catalog → mug page: options, price, one way to start, studio gets the colour", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Design your own gift",
  );
  await noSideScroll(page);

  // Every product has a print config now: each card is a link.
  for (const id of ["tshirt", "hoodie"])
    await expect(page.getByTestId(`product-card-${id}`)).toHaveAttribute(
      "href",
      `/products/${id}`,
    );

  // Under the grid: the way out for someone who did not pick a product.
  const promo = page.getByTestId("products-designs-promo");
  await expect(promo).toHaveAttribute("href", "/designs");
  await expect(promo).toContainText("Not sure what to make?");

  await page.getByTestId("product-card-mug").tap();
  await expect(page).toHaveURL(/\/products\/[\w-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Custom Mug",
  );
  await noSideScroll(page);

  // (Prices come from the store; the e2e build has none — see catalog-model tests.)
  await expect(page.getByTestId("product-spec")).toContainText("Gloss White");

  // Colour is a radio group; picking Black swaps the main photo and the spec.
  const colours = page.getByRole("group", { name: /Colour/ });
  await colours.getByText("Gloss Black").tap();
  await expect(page.getByRole("radio", { name: "Gloss Black" })).toBeChecked();
  await expect(page.getByTestId("product-spec")).toContainText("Gloss Black");
  await expect(
    page.getByRole("img", { name: "Plain gloss black mug" }).first(),
  ).toBeVisible();

  // Before a city is chosen the delivery box says what's true everywhere.
  await expect(page.getByTestId("delivery-result")).toHaveText(
    "Delivery anywhere in Pakistan · Rs 300 or less · arrives in 6–10 days",
  );
  await expect(page.getByTestId("reprint-promise")).toContainText(
    "Free reprint if it arrives misprinted or damaged",
  );
  await expect(page.getByTestId("photo-tips")).toContainText(
    "about 1,800 px wide",
  );
  await expect(page.locator("#designs")).toContainText("Ready-made designs");

  await page.getByRole("link", { name: "Add your photo or text" }).tap();
  await expect(page).toHaveURL(/\/design\/mug$/);
  await expect(page.getByTestId("editor-status")).toBeAttached();
  // The studio opened in the colour picked on the product page.
  await expect(
    page.getByRole("radio", { name: /Black/ }).first(),
  ).toBeChecked();
});

test("delivery: any town is accepted at Rs 300, known cities keep their rate, the city is remembered", async ({
  page,
}) => {
  await page.goto("/products/mug");
  // Details start closed; tapping the heading opens them.
  const details = page.getByTestId("product-details");
  await expect(details).not.toHaveAttribute("open");
  await expect(page.getByText("Up to 22.8 × 8.9 cm")).toBeHidden();
  await page.getByText("Details about the product").tap();
  await expect(details).toHaveAttribute("open", "");
  await expect(page.getByText("Up to 22.8 × 8.9 cm")).toBeVisible();
  await page.getByText("Details about the product").tap();
  await expect(details).not.toHaveAttribute("open");

  const city = page.getByLabel("Delivery to your city");
  await expect(page.locator("#city-hint")).toHaveText(
    "We deliver to every city and town in Pakistan.",
  );
  // Empty and focused: "anywhere else" comes first.
  await city.focus();
  await expect(page.getByTestId("city-anywhere")).toHaveText(
    "Anywhere else in Pakistan · Rs 300",
  );

  // A made-up town: offered as typed, at the rate for everywhere else.
  await city.fill("Chak Jhumra Khurd");
  await expect(page.getByTestId("city-own")).toHaveText(
    "Deliver to Chak Jhumra KhurdRs 300",
  );
  await page.getByTestId("city-own").tap();
  const result = page.getByTestId("delivery-result");
  await expect(result).toContainText(
    "Delivery to Chak Jhumra Khurd · Rs 300 · Arrives",
  );

  // A known city with its own rate; an alias finds it.
  await city.fill("lah");
  await page.getByRole("option", { name: /^Lahore/ }).tap();
  await expect(result).toContainText("Delivery to Lahore · Rs 200 · Arrives");
  await noSideScroll(page);

  // Keyboard: arrow down + Enter picks the first suggestion.
  await city.fill("Pindi");
  await city.press("Enter");
  await expect(city).toHaveValue("Rawalpindi");
  await expect(result).toContainText("Delivery to Rawalpindi · Rs 300");

  await page.reload();
  await expect(city).toHaveValue("Rawalpindi");
  await expect(result).toContainText("Rawalpindi");
});

// Not-found is streamed after loading.tsx, so Next sends it as a "soft 404"
// (status 200 + noindex) — see node_modules/next/dist/docs loading.md "Status Codes".
test("unknown product slugs get the not-found page", async ({ page }) => {
  for (const path of ["/products/nope"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "We can’t find that page" }),
    ).toBeVisible();
    expect(
      await page.locator('meta[name="robots"][content*="noindex"]').count(),
    ).toBeGreaterThan(0);
    await expect(page.getByTestId("start-designing")).toHaveCount(0);
  }
});
