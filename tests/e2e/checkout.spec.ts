import { expect, test, type Page } from "@playwright/test";
import design from "../fixtures/design-mug.json";

// Orders are numbered by the (shared) mock store: keep this file's tests in order.
test.describe.configure({ mode: "serial" });

/** A photo whose ORIGINAL is `px` wide, printed 100 mm wide (px / 3.937 in = DPI). */
const photo = (px: number) => ({
  type: "Image",
  src: "asset:test",
  assetId: "test",
  sourceWidthPx: px,
  sourceHeightPx: px,
  width: 100,
  height: 100,
  scaleX: 1,
  scaleY: 1,
});

async function seedDraft(page: Page, extraObjects: unknown[] = []) {
  const doc = {
    ...design,
    fabric: {
      ...design.fabric,
      objects: [...design.fabric.objects, ...extraObjects],
    },
  };
  await page.addInitScript((json) => {
    localStorage.setItem("giftified:draft:mug", json);
  }, JSON.stringify(doc));
}

async function fillForm(page: Page) {
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByLabel("City").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await expect(page.getByLabel("City")).toHaveValue("Lahore");
  await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
}

const orderNumber = async (page: Page) =>
  Number(
    (await page.getByTestId("order-number").textContent())?.replace("#", ""),
  );

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("COD checkout on a 360px phone: preview → order → confirmation", async ({
  page,
}) => {
  await seedDraft(page);
  await page.goto("/design/mug/preview");
  await page.getByRole("link", { name: "Order", exact: true }).tap();
  await expect(page).toHaveURL(/\/design\/mug\/order$/);
  await expect(page.locator('[aria-current="step"]')).toHaveText(/Order/);

  const phone = page.getByLabel("Mobile number");
  await expect(phone).toHaveAttribute("inputmode", "tel");
  expect((await phone.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  await expect(page.getByTestId("shipping")).toHaveText("Choose your city");
  await fillForm(page);
  await expect(page.getByTestId("shipping")).toHaveText("Rs 200");
  await expect(page.getByTestId("total")).toHaveText("Rs 1,699");
  await page.getByRole("button", { name: "One more" }).tap();
  await expect(page.getByTestId("total")).toHaveText("Rs 3,198");

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);

  const upload = page.waitForResponse(
    (r) => r.url().endsWith("/api/designs") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Place order/ }).tap();
  const { designId } = (await (await upload).json()) as { designId: string };
  await expect(page).toHaveURL(/\/order\/\d+$/);
  // The design the print job needs is really in storage.
  const saved = await page.request.get(
    `/api/dev-storage/designs/${designId}/design.json`,
  );
  expect(saved.status()).toBe(200);
  await expect(page.getByText("Thank you!")).toBeVisible();
  await expect(page.getByTestId("confirm-message")).toContainText(
    "+92 300 ***4567",
  );
  await expect(page.getByTestId("order-total")).toHaveText("Rs 3,198");
  expect(await orderNumber(page)).toBeGreaterThan(0);
});

test("double submit creates one order", async ({ page }) => {
  await seedDraft(page);
  const place = async () => {
    await page.goto("/design/mug/order");
    await fillForm(page);
    await expect(page.getByTestId("total")).toHaveText("Rs 1,699");
    // Two submits before React re-renders the disabled button.
    await page.evaluate(() => {
      const form = document.querySelector("form")!;
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page).toHaveURL(/\/order\/\d+$/);
    return orderNumber(page);
  };
  const first = await place();
  const second = await place();
  // A duplicate from the first attempt would have taken `first + 1`.
  expect(second).toBe(first + 1);
});

test("shows plain-language errors inline and keeps the customer on the form", async ({
  page,
}) => {
  await seedDraft(page);
  await page.goto("/design/mug/order");
  await page.getByLabel("Mobile number").fill("042 35761234");
  await page.getByLabel("Full name").tap(); // blur → client-side phone check
  await expect(page.getByText(/Pakistani mobile number/)).toBeVisible();
  await page.getByRole("button", { name: /Place order/ }).tap();
  await expect(page.getByText("Please write your full name.")).toBeVisible();
  await expect(page.getByText("Please choose your city.")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page).toHaveURL(/\/design\/mug\/order$/);
});

test("blocks ordering when a photo is too blurry", async ({ page }) => {
  await seedDraft(page, [photo(400)]); // ~102 DPI
  await page.goto("/design/mug/order");
  await expect(page.getByTestId("checkout-blocked")).toContainText(
    "A photo is too blurry to print — go back and make it smaller",
  );
  await expect(page.getByRole("button", { name: /Place order/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("link", { name: "Back to the editor" }),
  ).toHaveAttribute("href", "/design/mug");
});

test("allows a slightly soft photo with a gentle note", async ({ page }) => {
  await seedDraft(page, [photo(700)]); // ~178 DPI
  await page.goto("/design/mug/order");
  await expect(page.getByText(/may look a little soft/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Place order/ })).toBeEnabled();
});
