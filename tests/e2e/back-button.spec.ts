import { expect, test, type Page } from "@playwright/test";
import { openEditorWithText } from "./helpers";

/**
 * The open sheet's history entry is added on the next tick (see
 * `useBackToClose`), so a test that presses Back immediately can race it.
 */
async function waitForBackEntry(page: Page) {
  await expect
    .poll(() => page.evaluate(() => history.state?.backOverlay ?? null))
    .not.toBeNull();
}

test("Back closes a bottom sheet instead of leaving the designer", async ({
  page,
}) => {
  await page.goto("/");
  await openEditorWithText(page);
  await page.getByRole("button", { name: "Background colour" }).tap();
  const sheet = page.getByTestId("sheet");
  await expect(sheet).toBeVisible();
  await waitForBackEntry(page);

  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/\/design\/mug$/);

  // Closing with × leaves no entry behind: Back then leaves the designer.
  await page.getByRole("button", { name: "Background colour" }).tap();
  await expect(sheet).toBeVisible();
  await waitForBackEntry(page);
  await sheet.getByRole("button", { name: "Close" }).tap();
  await expect(sheet).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => history.state?.backOverlay))
    .toBeUndefined();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});
