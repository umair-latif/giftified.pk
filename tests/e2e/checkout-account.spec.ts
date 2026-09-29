import { expect, test, type Page } from "@playwright/test";
import design from "../fixtures/design-mug.json";

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

const email = `co-${Date.now()}@example.pk`;

test("password fields have a show/hide eye", async ({ page }) => {
  for (const [url, id] of [
    ["/sign-in", "si-password"],
    ["/sign-up", "su-password"],
  ] as const) {
    await page.goto(url);
    const input = page.locator(`#${id}`);
    await input.fill("secret words");
    await expect(input).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).tap();
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveValue("secret words");
    await page.getByRole("button", { name: "Hide password" }).tap();
    await expect(input).toHaveAttribute("type", "password");
  }
});

test("checkout fills the signed-in customer's details and offers to save the address", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Sara Ali");
  await page.getByLabel("Email").fill(email);
  await page.locator("#su-password").fill("correct horse");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page).toHaveURL(/\/account$/);

  await seedCart(page);
  await page.goto("/checkout");
  await expect(page.getByLabel("Full name")).toHaveValue("Sara Ali");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  // No address on the account yet: empty fields, and saving is offered (ticked).
  await expect(page.getByLabel("Address")).toHaveValue("");
  await expect(page.getByLabel(/Save these details/)).toBeChecked();
});

test("a guest sees no account prompts; a different delivery address is priced by its city", async ({
  page,
}) => {
  await seedCart(page);
  await page.goto("/checkout");
  await expect(page.getByLabel(/Save these details/)).toHaveCount(0);
  await expect(page.getByTestId("delivery-block")).toHaveCount(0);

  await page.getByLabel("City").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await expect(page.getByTestId("shipping")).toContainText("200");

  await page.getByLabel(/Deliver to a different place/).tap();
  await expect(page.getByTestId("delivery-block")).toBeVisible();
  await expect(page.getByTestId("shipping")).toHaveText(
    "Choose the delivery city",
  );
  await page.getByLabel("Delivery city").fill("kar");
  await page.getByRole("option", { name: "Karachi" }).tap();
  await expect(page.getByTestId("shipping")).toContainText("250");

  await page.getByLabel(/Deliver to a different place/).tap();
  await expect(page.getByTestId("delivery-block")).toHaveCount(0);
  await expect(page.getByTestId("shipping")).toContainText("200");
});
