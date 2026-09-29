import { expect, test, type Page } from "@playwright/test";
import { openEditorWithText } from "./helpers";

async function addToCart(page: Page) {
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  const add = page.getByRole("button", { name: "Add to cart" });
  await expect(add).toBeEnabled();
  await add.tap();
  await expect(page).toHaveURL(/\/cart$/);
}

test("coupon: a wrong code says why, a good one takes money off in the cart and at checkout, and can be removed", async ({
  page,
}) => {
  await openEditorWithText(page);
  await addToCart(page);
  await page.getByLabel("Delivery city").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 1,699"); // 1,499 + 200 delivery

  await page.getByLabel("Coupon code").fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).tap();
  await expect(page.getByTestId("coupon-error")).toContainText(
    "don’t recognise",
  );
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 1,699");

  await page.getByLabel("Coupon code").fill("welcome10");
  await page.getByRole("button", { name: "Apply" }).tap();
  await expect(page.getByTestId("coupon-applied")).toContainText(/welcome10/i);
  await expect(page.getByTestId("cart-discount")).toHaveText("−Rs 150"); // 10 % of 1,499
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 1,549");

  // Checkout shows the same discount (the code is remembered on this phone).
  await page.getByRole("link", { name: "Checkout" }).tap();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("discount")).toHaveText("−Rs 150");
  await expect(page.getByTestId("coupon-applied")).toContainText(/welcome10/i);

  // Removing it brings the full price back.
  await page.getByRole("button", { name: "Remove" }).tap();
  await expect(page.getByTestId("discount")).toHaveCount(0);
});
