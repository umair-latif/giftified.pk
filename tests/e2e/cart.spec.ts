import { expect, test, type Page } from "@playwright/test";
import { openEditorWithText, status } from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

/** Editor → Next → Preview → Add to cart. */
async function addToCart(page: Page) {
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  await expect(page).toHaveURL(/\/design\/mug\/preview$/);
  const add = page.getByRole("button", { name: "Add to cart" });
  await expect(add).toBeEnabled();
  await add.tap();
  await expect(page).toHaveURL(/\/cart$/);
}

test("two designs → cart → edit one → quantities → reload keeps it", async ({
  page,
}) => {
  await openEditorWithText(page);
  await addToCart(page);

  const lines = page.getByTestId("cart-line");
  await expect(lines).toHaveCount(1);
  await expect(
    lines.first().getByRole("img", { name: "Your design" }),
  ).toBeVisible();
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 1,499");
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  // Quantity and delivery.
  await lines.first().getByRole("button", { name: "One more" }).tap();
  await expect(page.getByTestId("line-quantity")).toHaveText("2");
  await page.getByLabel("Delivery city").fill("lah");
  await page.getByRole("option", { name: "Lahore" }).tap();
  await expect(page.getByTestId("cart-shipping")).toHaveText("Rs 200");
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 3,198");
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  // Edit the design in the cart: the editor opens it, not a fresh draft.
  await lines.first().getByRole("link", { name: "Edit design" }).tap();
  await expect(
    page.getByRole("heading", { name: "Edit design" }),
  ).toBeVisible();
  await expect(status(page)).toHaveText(/1 layer/);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(status(page)).toContainText("textbox");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  await expect(page).toHaveURL(/\/design\/mug\/preview\?item=/);
  await expect(page.getByTestId("preview-layers")).toHaveText("2");
  await page.getByRole("button", { name: "Save changes" }).tap();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(lines).toHaveCount(1);

  // "Design another one" goes to the products page, where the product is chosen.
  await page.getByRole("link", { name: "Design another one" }).tap();
  await expect(page).toHaveURL(/\/products$/);
  await page.getByTestId("product-card-mug").tap();
  await page.getByRole("link", { name: "Start designing" }).tap();
  // A second design starts from an empty editor.
  await expect(status(page)).toHaveText(/0 layers/);
  await expect(
    page.getByRole("button", { name: "Text", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await addToCart(page);
  await expect(lines).toHaveCount(2);
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 4,697");

  // Everything survives a reload (city remembered too).
  await page.reload();
  await expect(lines).toHaveCount(2);
  await expect(page.getByTestId("cart-total")).toHaveText("Rs 4,697");

  // Remove the first line.
  await lines.first().getByRole("button", { name: "Remove" }).tap();
  await expect(lines).toHaveCount(1);
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);
});

test("empty cart and a stale edit link", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByTestId("cart-empty")).toBeVisible();
  await page.goto("/design/mug?item=does-not-exist");
  await expect(page.getByTestId("missing-item")).toBeVisible();
  await page.goto("/design/mug/order");
  await expect(page).toHaveURL(/\/cart$/);
});

test("preview blocks adding an empty design", async ({ page }) => {
  await page.goto("/design/mug/preview");
  await expect(page.getByText("Nothing designed yet.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add to cart" }),
  ).toBeDisabled();
});

test("photos of cart designs survive starting a new design", async ({
  page,
}) => {
  await page.goto("/design/mug");
  await expect(status(page)).toHaveText(/0 layers/);
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 2400;
    c.height = 1000;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#2b8496";
    ctx.fillRect(0, 0, 2400, 1000);
    return c.toDataURL("image/png").split(",")[1]!;
  });
  await page.getByTestId("image-input").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(status(page)).toContainText("image");
  await addToCart(page);

  // Opening a fresh editor prunes unused photos — the cart's photo must stay.
  await page.goto("/design/mug");
  await expect(status(page)).toHaveText(/0 layers/);
  await page.goto("/cart");
  await page.getByRole("link", { name: "Edit design" }).tap();
  await expect(status(page)).toHaveText(/1 layer/);
  await expect(page.getByTestId("editor-notice")).toHaveCount(0);
});
