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

interface SeedLine {
  quantity: number;
  extraObjects?: unknown[];
}

/**
 * Puts cart lines (each with its own saved design) in localStorage once per
 * test — init scripts run on every navigation, and checkout must be able to
 * empty the cart.
 */
async function seedCart(page: Page, lines: SeedLine[]) {
  const store: Record<string, string> = {};
  const items = lines.map((l, i) => {
    const designKey = `seed-design-${i}`;
    store[`giftified:design:${designKey}`] = JSON.stringify({
      ...design,
      fabric: {
        ...design.fabric,
        objects: [...design.fabric.objects, ...(l.extraObjects ?? [])],
      },
    });
    return {
      id: `seed-line-${i}`,
      productId: "mug",
      colourId: "white",
      quantity: l.quantity,
      designKey,
      addedAt: "2026-09-28T10:00:00.000Z",
    };
  });
  store["giftified:cart"] = JSON.stringify(items);
  await page.addInitScript((s) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, store);
}

async function fillForm(page: Page) {
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByLabel("City").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await expect(page.getByLabel("City")).toHaveValue("Lahore");
  await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
  await confirmContent(page);
}

const confirmBox = (page: Page) => page.getByLabel(/I confirm my design/);
async function confirmContent(page: Page) {
  await confirmBox(page).tap();
  await expect(confirmBox(page)).toBeChecked();
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

test("two cart items → checkout → one order with both lines", async ({
  page,
}) => {
  await seedCart(page, [{ quantity: 2 }, { quantity: 1 }]);
  await page.goto("/cart");
  await page.getByRole("link", { name: /Checkout/ }).tap();
  await expect(page).toHaveURL(/\/checkout$/);

  const lines = page.getByTestId("checkout-line");
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toContainText("Qty 2");
  await expect(lines.nth(0).getByTestId("line-price")).toHaveText("Rs 2,998");
  await expect(lines.nth(1).getByTestId("line-price")).toHaveText("Rs 1,499");

  const phone = page.getByLabel("Mobile number");
  await expect(phone).toHaveAttribute("inputmode", "tel");
  expect((await phone.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await fillForm(page);
  await page.getByLabel(/Email/).fill("Ayesha@Example.pk");
  await expect(page.getByTestId("shipping")).toHaveText("Rs 200");
  await expect(page.getByTestId("total")).toHaveText("Rs 4,697");

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);

  const uploads: string[] = [];
  page.on("response", async (r) => {
    if (r.url().endsWith("/api/designs") && r.request().method() === "POST")
      uploads.push(((await r.json()) as { designId: string }).designId);
  });
  await page.getByRole("button", { name: /Place order/ }).tap();
  await expect(page).toHaveURL(/\/order\/\d+\?t=[\w-]{22}$/);

  // Each design was uploaded once and is really in storage for the print job.
  expect(uploads).toHaveLength(2);
  for (const id of uploads) {
    const saved = await page.request.get(
      `/api/dev-storage/designs/${id}/design.json`,
    );
    expect(saved.status()).toBe(200);
  }

  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
  await expect(page.getByTestId("order-line")).toHaveCount(2);
  await expect(page.getByTestId("order-total")).toHaveText("Rs 4,697");
  await expect(page.getByTestId("confirm-message")).toContainText(
    "0300 •••• 567",
  );
  expect(await orderNumber(page)).toBeGreaterThan(0);
  // The cart is empty now, and the typed details aren't kept any more.
  await expect(page.getByTestId("cart-count")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("giftified:checkout-draft"),
    ),
  ).toBeNull();
});

test("Edit cart and back: checkout keeps what was typed", async ({ page }) => {
  await seedCart(page, [{ quantity: 1 }]);
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
  await page.getByRole("link", { name: "Edit cart" }).tap();
  await expect(page).toHaveURL(/\/cart$/);
  await page.getByRole("link", { name: /Checkout/ }).tap();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Full name")).toHaveValue("Ayesha Khan");
  await expect(page.getByLabel("Mobile number")).toHaveValue("0300 1234567");
  await expect(page.getByLabel("Address")).toHaveValue(
    "House 12, Street 4, Model Town",
  );
  // The confirmation tick is never remembered: it's asked every time.
  await expect(confirmBox(page)).not.toBeChecked();
});

test("double tap creates one order", async ({ page }) => {
  const place = async () => {
    await page.evaluate(() => sessionStorage.removeItem("seeded"));
    await page.goto("/checkout");
    await fillForm(page);
    await expect(page.getByTestId("total")).toHaveText("Rs 1,699");
    // Two submits before React re-renders the disabled button.
    await page.evaluate(() => {
      const form = document.querySelector("form")!;
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page).toHaveURL(/\/order\/\d+\?t=[\w-]+$/);
    return orderNumber(page);
  };
  await seedCart(page, [{ quantity: 1 }]);
  await page.goto("/");
  const first = await place();
  const second = await place();
  // A duplicate from the first attempt would have taken `first + 1`.
  expect(second).toBe(first + 1);
});

test("an empty cart shows a way back to the products", async ({ page }) => {
  await page.goto("/checkout");
  const empty = page.getByTestId("checkout-empty");
  await expect(empty).toContainText("Your cart is empty.");
  await empty.getByRole("link", { name: "Browse products" }).tap();
  await expect(page).toHaveURL(/\/products$/);
});

test("shows plain-language errors inline and keeps the customer on the form", async ({
  page,
}) => {
  await seedCart(page, [{ quantity: 1 }]);
  await page.goto("/checkout");
  await page.getByLabel("Mobile number").fill("042 35761234");
  await page.getByLabel("Full name").tap(); // blur → client-side phone check
  await expect(page.getByText(/Pakistani mobile number/)).toBeVisible();
  await page.getByLabel(/Email/).fill("ayesha@");
  await confirmContent(page);
  await page.getByRole("button", { name: /Place order/ }).tap();
  await expect(page.getByText("Please write your full name.")).toBeVisible();
  await expect(page.getByText("Please choose your city.")).toBeVisible();
  await expect(
    page.getByText("Please check your email address, or leave it empty."),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page).toHaveURL(/\/checkout$/);
});

test("blocks the order when one item's photo is too blurry, and says which", async ({
  page,
}) => {
  await seedCart(page, [
    { quantity: 1 },
    { quantity: 1, extraObjects: [photo(400)] }, // ~102 DPI → block
  ]);
  await page.goto("/checkout");
  const blocked = page.getByTestId("checkout-blocked");
  await expect(blocked).toContainText("Item 2 (Custom Mug)");
  await expect(blocked).toContainText("too blurry");
  await expect(
    blocked.getByRole("link", { name: "Edit design" }),
  ).toHaveAttribute("href", "/design/mug?item=seed-line-1");
  await expect(
    page.getByRole("button", { name: /Place order/ }),
  ).toBeDisabled();
});

test("a slightly soft photo gets a gentle note but can be ordered", async ({
  page,
}) => {
  await seedCart(page, [{ quantity: 1, extraObjects: [photo(700)] }]); // ~178 DPI → warn
  await page.goto("/checkout");
  await expect(page.getByText(/may look a little soft/)).toBeVisible();
  await expect(page.getByTestId("checkout-blocked")).toHaveCount(0);
  await confirmContent(page);
  await expect(page.getByRole("button", { name: /Place order/ })).toBeEnabled();
});

test("Place order waits for the content confirmation; legal links and opt-in", async ({
  page,
}) => {
  await seedCart(page, [{ quantity: 1 }]);
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByLabel("City").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
  await expect(page.getByTestId("total")).toHaveText("Rs 1,699");

  // Both boxes start unticked; the button waits for the confirmation only.
  const place = page.getByRole("button", { name: /Place order/ });
  const optIn = page.getByLabel(/Send me offers and discounts/);
  await expect(confirmBox(page)).not.toBeChecked();
  await expect(optIn).not.toBeChecked();
  await expect(place).toBeDisabled();
  await expect(page.getByTestId("confirm-hint")).toHaveText(
    "Please tick the box to confirm your design follows our Printing guidelines.",
  );

  // Legal links and the guidelines link inside the confirmation: all open in a
  // new tab, so reading them never loses the filled-in form.
  const consents = page.getByTestId("checkout-consents");
  for (const [name, href] of [
    ["Terms (opens in a new tab)", "/terms"],
    ["Privacy notice (opens in a new tab)", "/privacy"],
  ] as const) {
    const l = consents.getByRole("link", { name, exact: true });
    await expect(l).toHaveAttribute("href", href);
    await expect(l).toHaveAttribute("target", "_blank");
  }
  const guidelines = consents.getByRole("link", {
    name: "Printing guidelines (opens in a new tab)",
  });
  await expect(guidelines).toHaveCount(2);
  for (const l of await guidelines.all()) {
    await expect(l).toHaveAttribute("href", "/printing-guidelines");
    await expect(l).toHaveAttribute("target", "_blank");
  }

  // Whole rows are finger-sized tap targets.
  for (const row of await consents.locator("label").all())
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);

  // Tapping the row's text (not a link) ticks the box.
  await consents.getByText("I have the right to print everything in it").tap();
  await expect(confirmBox(page)).toBeChecked();
  await expect(page.getByTestId("confirm-hint")).toHaveCount(0);
  await expect(place).toBeEnabled();
  await consents.getByText("I have the right to print everything in it").tap();
  await expect(place).toBeDisabled();
  await confirmContent(page);
  await optIn.tap();
  await expect(optIn).toBeChecked();

  await place.tap();
  await expect(page).toHaveURL(/\/order\/\d+\?t=[\w-]+$/);
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
});

test("reading the Printing guidelines opens a new tab; checkout keeps what was typed", async ({
  page,
}) => {
  await seedCart(page, [{ quantity: 1 }]);
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Ayesha Khan");
  await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
  const [tab] = await Promise.all([
    page.context().waitForEvent("page"),
    page
      .getByTestId("checkout-consents")
      .getByRole("link", { name: /^Printing guidelines/ })
      .first()
      .tap(),
  ]);
  await expect(tab).toHaveURL(/\/printing-guidelines$/);
  await tab.close();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByTestId("checkout-line")).toHaveCount(1);
  await expect(page.getByLabel("Full name")).toHaveValue("Ayesha Khan");
  await expect(page.getByLabel("Address")).toHaveValue(
    "House 12, Street 4, Model Town",
  );
});
