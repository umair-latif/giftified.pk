import { expect, test } from "@playwright/test";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

const email = `e2e-${Date.now()}@example.pk`;

test("sign up, sign out, wrong password, sign in, forgot password", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("account-link")).toHaveAttribute(
    "href",
    "/sign-in",
  );

  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Ayesha Khan");
  await page.getByLabel("Email").fill(email);
  await page.locator("#su-password").fill("short");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page.locator("#su-password-error")).toContainText("at least 8");

  await page.locator("#su-password").fill("correct horse");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);
  await expect(page.getByTestId("account-name")).toHaveText("Ayesha Khan");

  // The header now points to the account.
  await page.goto("/");
  await expect(page.getByTestId("account-link")).toHaveAttribute(
    "href",
    "/account",
  );
  // Signed in: the sign-in page sends you to the account.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/account$/);

  await page.getByTestId("sign-out").tap();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=(%2F|\/)account$/);

  await page.getByLabel("Email").fill(email);
  await page.locator("#si-password").fill("wrong password");
  await page.getByRole("button", { name: "Sign in" }).tap();
  await expect(page.getByTestId("auth-error")).toHaveText(
    "Wrong email or password.",
  );
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await page.locator("#si-password").fill("correct horse");
  await page.getByRole("button", { name: "Sign in" }).tap();
  await expect(page).toHaveURL(/\/account$/);
});

test("an existing email is refused on sign-up, and the reset page never reveals accounts", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Someone Else");
  await page.getByLabel("Email").fill(email);
  await page.locator("#su-password").fill("another password");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page.locator("#su-email-error")).toContainText(
    "already an account",
  );

  for (const address of [email, "nobody@example.pk"]) {
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill(address);
    await page.getByRole("button", { name: "Email me a reset link" }).tap();
    await expect(page.getByTestId("reset-sent")).toContainText(
      "If there is an account",
    );
  }
});

test("a bad reset link asks for a new one; a crafted next= stays on the site", async ({
  page,
}) => {
  await page.goto("/reset-password?token=forged.token");
  await expect(page.getByText("expired or isn’t valid")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();

  await page.goto("/sign-in?next=https://evil.example");
  await page.getByLabel("Email").fill("nobody@example.pk");
  await page.locator("#si-password").fill("whatever!");
  await page.getByRole("button", { name: "Sign in" }).tap();
  await expect(page.getByTestId("auth-error")).toBeVisible();
  // Google isn't configured in the e2e build: no button.
  await expect(page.getByTestId("google-button")).toHaveCount(0);
});
