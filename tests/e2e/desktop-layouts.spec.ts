import { expect, test, type Page } from "@playwright/test";
import design from "../fixtures/design-mug.json";

// Desktop layouts: product page side by side, checkout with a sticky order summary.
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

async function seedCart(page: Page) {
  const store = {
    "giftified:design:seed-design-0": JSON.stringify(design),
    "giftified:cart": JSON.stringify([
      {
        id: "seed-line-0",
        productId: "mug",
        colourId: "white",
        quantity: 1,
        designKey: "seed-design-0",
        addedAt: "2026-09-28T10:00:00.000Z",
      },
    ]),
  };
  await page.addInitScript((s) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, store);
}

test("product page: gallery left, title and Start designing right, details full width below", async ({
  page,
}) => {
  await page.goto("/products/mug");
  const image = await page.locator("main svg, main img").first().boundingBox();
  const title = await page.getByRole("heading", { level: 1 }).boundingBox();
  const start = await page
    .getByRole("link", { name: "Start designing" })
    .boundingBox();
  const details = await page.getByTestId("product-details").boundingBox();
  expect(image!.width).toBeGreaterThan(380);
  for (const box of [title, start])
    expect(box!.x).toBeGreaterThan(image!.x + image!.width - 1);
  expect(title!.y).toBeLessThan(start!.y);
  // Details: closed at first, below both columns, spanning their full width.
  await expect(page.getByTestId("product-details")).not.toHaveAttribute("open");
  expect(details!.y).toBeGreaterThan(image!.y + image!.height - 1);
  expect(details!.x).toBeLessThanOrEqual(image!.x + 1);
  expect(details!.x + details!.width).toBeGreaterThanOrEqual(
    start!.x + start!.width - 1,
  );
  // Ready-made designs is full width below the details.
  const designs = await page
    .getByRole("heading", { name: /Ready-made designs/ })
    .boundingBox();
  expect(designs!.y).toBeGreaterThan(details!.y + details!.height - 1);
});

test("checkout: form on the left, order summary and Place order on the right", async ({
  page,
}) => {
  await seedCart(page);
  await page.goto("/checkout");
  const name = await page.getByLabel("Full name").boundingBox();
  const summary = await page
    .getByRole("heading", { name: "Your order" })
    .boundingBox();
  const total = await page.getByTestId("total").boundingBox();
  const place = await page
    .getByRole("button", { name: /Place order/ })
    .boundingBox();
  for (const box of [summary, total, place])
    expect(box!.x).toBeGreaterThan(name!.x + name!.width);
  // Summary, then totals, then the button: one column.
  expect(summary!.y).toBeLessThan(total!.y);
  expect(total!.y).toBeLessThan(place!.y);
  // Sticky: after scrolling the button is still on screen.
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  const after = await page
    .getByRole("button", { name: /Place order/ })
    .boundingBox();
  expect(after!.y).toBeGreaterThan(0);
  expect(after!.y).toBeLessThan(800);
});

test("cart: items on the left, delivery city, totals and Checkout on the right", async ({
  page,
}) => {
  await seedCart(page);
  await page.goto("/cart");
  const line = await page.getByLabel("Cart items").boundingBox();
  const city = await page.getByLabel("Delivery city").boundingBox();
  const total = await page.getByTestId("cart-total").boundingBox();
  const checkout = await page
    .getByRole("link", { name: /Checkout/ })
    .boundingBox();
  for (const box of [city, total, checkout])
    expect(box!.x).toBeGreaterThan(line!.x + line!.width);
  expect(city!.y).toBeLessThan(total!.y);
  expect(total!.y).toBeLessThan(checkout!.y);
});
