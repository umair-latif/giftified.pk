import { expect, test, type Page } from "@playwright/test";
import design from "../fixtures/design-mug.json";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

async function signUp(page: Page, prefix: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Sara Ali");
  await page.getByLabel("Email").fill(`${prefix}-${Date.now()}@example.pk`);
  await page.locator("#su-password").fill("correct horse");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page).toHaveURL(/\/account$/);
}

async function seedCart(page: Page) {
  await page.evaluate((d) => {
    localStorage.setItem("giftified:design:acc-design-0", JSON.stringify(d));
    localStorage.setItem(
      "giftified:cart",
      JSON.stringify([
        {
          id: "acc-line-0",
          productId: "mug",
          colourId: "white",
          quantity: 2,
          designKey: "acc-design-0",
          addedAt: "2026-09-30T10:00:00.000Z",
        },
      ]),
    );
  }, design);
}

test("address, order history, order again, profile, and delete refused while an order is open", async ({
  page,
}) => {
  await signUp(page, "acc");

  // Delivery address: saved on the account, then fills checkout.
  await page.getByTestId("account-addresses-link").tap();
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByLabel("City").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
  await page.getByRole("button", { name: "Save address" }).tap();
  await expect(page.getByTestId("form-saved")).toBeVisible();

  await seedCart(page);
  await page.goto("/checkout");
  await expect(page.getByLabel("Address")).toHaveValue(
    "House 12, Street 4, Model Town",
  );
  await expect(page.getByLabel("City")).toHaveValue("Lahore");
  await page.getByLabel(/I confirm my design/).tap();
  await page.getByRole("button", { name: /Place order/ }).tap();
  await expect(page).toHaveURL(/\/order\/\d+\?t=/);
  const id = (await page.getByTestId("order-number").textContent())!.replace(
    "#",
    "",
  );

  // The order is in the account, with the same timeline.
  await page.goto("/account");
  await expect(page.getByTestId("account-latest-order")).toContainText(
    `Order #${id}`,
  );
  await page.getByTestId("account-orders-link").tap();
  await expect(page.getByTestId("account-order")).toHaveCount(1);
  await page.getByTestId("account-order").tap();
  await expect(page).toHaveURL(new RegExp(`/account/orders/${id}$`));
  await expect(page.getByTestId("order-timeline")).toBeVisible();

  // Order again puts the same design back in the cart, same quantity.
  await page.getByTestId("order-again").tap();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("line-quantity").first()).toContainText("2");

  // Profile: name and marketing preference.
  await page.goto("/account/profile");
  await page.getByLabel("First name").fill("Sana");
  await page.getByTestId("profile-marketing").check();
  await page.getByRole("button", { name: "Save", exact: true }).tap();
  await expect(page.getByTestId("form-saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("First name")).toHaveValue("Sana");
  await expect(page.getByTestId("profile-marketing")).toBeChecked();

  // The order is still open, so the account can't be deleted yet.
  await page.getByTestId("delete-account-start").tap();
  await page.getByLabel(/Type DELETE/).fill("DELETE");
  await page.getByTestId("delete-account-confirm").tap();
  await expect(page.getByText(/still working on/)).toBeVisible();
});

test("another customer's order looks missing", async ({ page }) => {
  await signUp(page, "acc-other");
  const res = await page.goto("/account/orders/1000");
  expect(res?.status()).toBe(404);
});

test("delete an account with no open orders", async ({ page }) => {
  await signUp(page, "acc-del");
  await page.goto("/account/profile");
  await page.getByTestId("delete-account-start").tap();
  await page.getByTestId("delete-account-confirm").tap();
  await expect(page.getByText("Type DELETE to confirm.")).toBeVisible();
  await page.getByLabel(/Type DELETE/).fill("delete");
  await page.getByTestId("delete-account-confirm").tap();
  await expect(page).toHaveURL(/\/account\/deleted$/);
  await expect(page.getByTestId("account-deleted")).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in/);
});
