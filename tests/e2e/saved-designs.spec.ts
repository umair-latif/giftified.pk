import { expect, test } from "@playwright/test";
import { openEditorWithText, status } from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("signed out, Save to my designs asks to sign in and comes back", async ({
  page,
}) => {
  await openEditorWithText(page);
  const link = page.getByTestId("save-design-sign-in");
  await expect(link).toHaveAttribute(
    "href",
    `/sign-in?next=${encodeURIComponent("/design/mug")}`,
  );
});

test("save a design, find it in My designs on another device, rename and delete it", async ({
  page,
  browser,
}) => {
  const email = `saved-${Date.now()}@example.pk`;
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Sara Ali");
  await page.getByLabel("Email").fill(email);
  await page.locator("#su-password").fill("correct horse");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page).toHaveURL(/\/account$/);

  await openEditorWithText(page);
  await page.getByTestId("save-design-button").tap();
  await expect(page.getByTestId("save-design-done")).toContainText("Saved as");
  // Saving again updates the same design (no copy).
  await page.getByTestId("save-design-button").tap();
  await expect(page.getByTestId("save-design-done")).toBeVisible();

  // "Another phone": fresh browser storage, same sign-in.
  const other = await browser.newContext({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  await other.addCookies(await page.context().cookies());
  const phone = await other.newPage();
  phone.on("pageerror", (e) => pageErrors.push(e.message));
  await phone.goto("/account/designs");
  await expect(phone.getByTestId("saved-design")).toHaveCount(1);

  await phone.getByRole("button", { name: "Rename" }).tap();
  await phone.getByLabel("Design name").fill("Ammi's Eid mug");
  await phone.getByRole("button", { name: "Save", exact: true }).tap();
  await expect(phone.getByTestId("saved-design-name")).toHaveText(
    "Ammi's Eid mug",
  );

  await phone.getByTestId("saved-design-open").tap();
  await expect(phone).toHaveURL(/\/design\/mug$/);
  await expect(status(phone)).toHaveText(/1 layer/);

  await phone.goto("/account/designs");
  await phone.getByTestId("saved-design-delete").tap();
  await phone.getByTestId("saved-design-confirm-delete").tap();
  await expect(phone.getByTestId("saved-designs-empty")).toBeVisible();
  await other.close();
});
