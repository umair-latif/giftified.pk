import { expect, test } from "@playwright/test";

test("t-shirt configuration opens a portrait editor and preserves its draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/products/tshirt");
  await page.getByRole("link", { name: "Start designing" }).tap();
  await expect(page).toHaveURL(/\/design\/tshirt$/);
  const guide = page.getByTestId("garment-guide");
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute(
    "src",
    "/mockups/tshirt-editor-front.webp",
  );
  await expect(guide).toHaveCSS("opacity", "1");
  await expect(guide).toHaveCSS("pointer-events", "none");
  const status = page.getByTestId("editor-status");
  await expect(status).toContainText("0 layers");
  await page.getByRole("button", { name: "Text", exact: true }).tap();
  await expect(status).toContainText("textbox");
  const host = page.getByTestId("canvas-host");
  const bounds = await host.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width / bounds!.height).toBeCloseTo(300 / 400, 2);
  // The canvas sits exactly on the designable area marked on the photo
  // (x 343-736, y 230-755 of 1080 px).
  const photo = (await guide.boundingBox())!;
  expect((bounds!.x - photo.x) / photo.width).toBeCloseTo(343 / 1080, 2);
  expect((bounds!.y - photo.y) / photo.height).toBeCloseTo(230 / 1080, 2);
  expect(bounds!.width / photo.width).toBeCloseTo(394 / 1080, 2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.reload();
  await expect(status).toContainText("1 layer");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  await expect(page.getByTestId("preview-layers")).toHaveText("1");
  await expect(page.getByText("Up to 30 × 40 cm")).toBeVisible();
  expect(errors).toEqual([]);
});

test("black t-shirt: black garment in the editor, black photos in the preview, Black in the cart", async ({
  page,
}) => {
  await page.goto("/design/tshirt");
  await expect(page.getByTestId("colour-white")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByTestId("colour-black").tap();
  await expect(page.getByTestId("garment-guide")).toHaveAttribute(
    "src",
    "/mockups/tshirt-editor-front-black.webp",
  );
  await page.getByRole("button", { name: "Text", exact: true }).tap();
  await expect(page.getByTestId("editor-status")).toContainText("textbox");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();
  // Colour is chosen while designing; the preview only shows it.
  await expect(page.getByTestId("colour-picker")).toHaveCount(0);
  await expect(page.getByTestId("preview-colour")).toContainText("Black");
  await expect(page.getByTestId("preview-thumb-front-black")).toBeVisible();
  await expect(page.getByTestId("preview-thumb-studio")).toHaveCount(0);
  const main = page.getByTestId("preview-mockup").getByRole("img");
  await expect(main).toHaveAttribute("src", /^data:image\//);
  await page.getByTestId("preview-mockup").screenshot({
    path: "test-results/tshirt-black-preview.png",
  });
  const add = page
    .getByRole("button", { name: "Add to cart" })
    .filter({ visible: true })
    .first();
  // A size is needed first; sold-out sizes can't be picked.
  await expect(add).toBeDisabled();
  await expect(page.getByTestId("size-XXL")).toBeDisabled();
  await page.getByTestId("size-L").tap();
  await expect(add).toBeEnabled();
  await add.tap();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-line")).toContainText("Black");
  await expect(page.getByTestId("cart-line")).toContainText("L");
});

test("the shirt colour and the background colour have different names", async ({
  page,
}) => {
  await page.goto("/design/tshirt");
  await expect(page.getByTestId("colour-picker")).toContainText(
    "Shirt colour:",
  );
  await expect(
    page.getByRole("radiogroup", { name: "Shirt colour" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Editor tools" })
      .getByRole("button", { name: "Background colour" }),
  ).toBeVisible();
});
