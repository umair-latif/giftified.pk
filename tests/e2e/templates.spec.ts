import { expect, test, type Page } from "@playwright/test";
import { openEditorWithText, signInEditor } from "./helpers";

async function makePng(page: Page, width: number, height: number) {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const c = document.createElement("canvas");
      c.width = w!;
      c.height = h!;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(0, 0, w!, h!);
      return c.toDataURL("image/png");
    },
    [width, height],
  );
  return Buffer.from(dataUrl.split(",")[1]!, "base64");
}

test("a designer marks a customer's photo with a library sample and publishes; customers must replace it", async ({
  page,
}) => {
  // Guests get no "Placeholder" button.
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page.getByTestId("image-input").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: await makePng(page, 1600, 1200),
  });
  await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Placeholder", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save as template" }),
  ).toHaveCount(0);

  await signInEditor(page);
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  // Designers only publish products now: no "Save as template".
  await expect(
    page.getByRole("button", { name: "Save as template" }),
  ).toHaveCount(0);
  await page.getByTestId("image-input").setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: await makePng(page, 1600, 1200),
  });
  await page.getByRole("button", { name: "Placeholder", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Placeholder images" });
  // Designers add photos to the library here; only library photos can be picked.
  await sheet.getByTestId("sample-input").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: await makePng(page, 900, 900),
  });
  await sheet
    .getByRole("button", { name: /^Placeholder image \d+$/ })
    .first()
    .click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByTestId("editor-status")).toContainText(
    "(placeholder)",
  );

  await page.getByRole("link", { name: /Preview/ }).click();
  await page
    .getByRole("button", { name: "Publish as product" })
    .first()
    .click();
  const pub = page.getByRole("dialog", { name: "Publish as product" });
  await pub.getByLabel("Name").fill("Eid card");
  await pub.getByLabel("Description").fill("An Eid mug with your photo.");
  await pub.getByLabel("Price (Rs)").fill("1799");
  await pub.getByText("Eid", { exact: true }).click();
  await pub.getByRole("button", { name: "Publish product" }).click();
  const saved = page.getByTestId("template-saved");
  await expect(saved).toContainText("Product saved");
  const id = (await saved.locator("code").textContent())!;

  // Its page can't be bought as it is: the customer must add their photo.
  await saved.getByRole("link", { name: "View the product page" }).click();
  await expect(page).toHaveURL(/\/designs\/eid-card-/);
  await expect(page.getByRole("link", { name: "Make it yours" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(
    0,
  );

  // The occasion page lists it and opens its product page.
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/occasions/eid")).text()).includes(
          "Eid card",
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.goto("/occasions/birthday");
  await expect(page.getByTestId("no-templates")).toBeVisible();

  // A customer (fresh browser) starting from it sees the sample hint.
  const customer = await page
    .context()
    .browser()!
    .newContext({
      ...test.info().project.use,
      baseURL: test.info().project.use.baseURL,
    });
  const cp = await customer.newPage();
  await cp.goto(`/design/mug?template=${id}`);
  await expect(cp.getByTestId("placeholder-hint")).toContainText(
    "1 sample photo",
  );
  await expect(cp).toHaveURL(/\/design\/mug$/); // ?template= dropped
  await customer.close();

  // A design still for sale can't be deleted here: trash it in WP admin first.
  await page.goto("/occasions/eid");
  page.once("dialog", (d) => void d.accept());
  const tile = page
    .getByTestId("template-grid")
    .getByRole("listitem")
    .filter({ hasText: "Eid card" });
  await tile.getByTestId("delete-template").click();
  await expect(tile.getByRole("alert")).toContainText("WP admin");
  expect((await page.request.get(`/api/templates/${id}`)).status()).toBe(200);
});

test("occasion pages exist for each tile and 404 for unknown ones", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shaadi" }).click();
  await expect(page).toHaveURL(/\/occasions\/shaadi$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shaadi");
  expect((await page.goto("/occasions/nope"))?.status()).toBe(404);
});

test("an unknown template opens a friendly message", async ({ page }) => {
  await page.goto("/design/mug?template=nope");
  await expect(page.getByTestId("template-start")).toContainText(
    "couldn't open",
  );
});

test("a template editor publishes a design as a product from the preview; others only see Add to cart", async ({
  page,
  browser,
  baseURL,
}) => {
  // Guests: the preview offers only "Add to cart".
  await openEditorWithText(page);
  await page.getByRole("link", { name: /Preview/ }).click();
  await expect(page).toHaveURL(/\/design\/mug\/preview/);
  await expect(
    page.getByRole("button", { name: "Add to cart" }).first(),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Publish as product" }),
  ).toHaveCount(0);

  // The listed editor publishes.
  const editorCtx = await browser.newContext({
    baseURL: baseURL!,
    viewport: { width: 360, height: 740 },
    hasTouch: true,
    isMobile: true,
  });
  const ep = await editorCtx.newPage();
  await signInEditor(ep);
  await openEditorWithText(ep);
  await ep.getByRole("link", { name: /Preview/ }).click();
  const publish = ep
    .getByRole("button", { name: "Publish as product" })
    .first();
  await expect(publish).toBeEnabled();
  await publish.click();
  const sheet = ep.getByRole("dialog", { name: "Publish as product" });
  const submit = sheet.getByRole("button", { name: "Publish product" });
  await sheet.getByLabel("Name").fill("Happy Birthday");
  await expect(submit).toBeDisabled(); // description and price are required
  await sheet
    .getByLabel("Description")
    .fill("A cheerful mug for any birthday.");
  // A plain mug's price is shown as a reference (and as the placeholder).
  await expect(sheet.getByTestId("base-price-hint")).toContainText("Rs 1,499");
  await expect(sheet.getByLabel("Price (Rs)")).toHaveAttribute(
    "placeholder",
    "1499",
  );
  await sheet.getByLabel("Price (Rs)").fill("1899");
  await submit.click();
  await expect(ep.getByTestId("template-saved")).toContainText("Product saved");

  // The product page: title, price, Add to cart / Make it yours.
  await ep.getByRole("link", { name: "View the product page" }).click();
  await expect(ep).toHaveURL(/\/designs\/happy-birthday-/);
  await expect(ep.getByRole("heading", { level: 1 })).toHaveText(
    "Happy Birthday",
  );
  await expect(ep.getByTestId("design-price")).toContainText("1,899");
  await expect(ep.getByRole("link", { name: "Make it yours" })).toHaveAttribute(
    "href",
    /\/design\/mug\?template=/,
  );
  // Product images: the design on the mug from several angles, not just the flat artwork.
  const gallery = ep.getByTestId("design-gallery");
  await expect(gallery).toBeVisible();
  await expect(
    gallery.getByRole("list", { name: "Views" }).getByRole("button"),
  ).toHaveCount(6); // 5 mockups + the flat design
  const image = gallery.locator("img").first();
  await expect
    .poll(async () => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  // Nothing may push the page wider than the phone: the gallery, its strip
  // and the buy box must all fit inside the viewport.
  const overflow = await ep.evaluate(() => {
    const w = window.innerWidth;
    return ["design-gallery", "design-buy-box"].flatMap((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return (
        [el, ...(el?.querySelectorAll("img, a, button, ul") ?? [])]
          .filter((e): e is Element => !!e)
          // The thumbnail strip scrolls sideways on purpose; its box must fit.
          .filter((e) => !e.closest("ul, .snap-x") || e.tagName === "UL")
          .filter((e) => e.getBoundingClientRect().right > w + 1)
          .map((e) => `${id}: ${e.tagName}`)
      );
    });
  });
  expect(overflow).toEqual([]);
  await gallery.getByTestId("design-thumb-2").click();
  // The picture is scrolled into the viewport (the strip snaps to it).
  await expect
    .poll(async () =>
      gallery.getByRole("img", { name: /left view/i }).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= -1 && r.right <= window.innerWidth + 1;
      }),
    )
    .toBe(true);
  await ep.getByRole("button", { name: "Add to cart" }).click();
  const added = ep.getByTestId("added-to-cart");
  await expect(added).toContainText("Added to your cart");
  await expect(
    added.getByRole("link", { name: "Make it yours" }),
  ).toBeVisible();

  // The cart prices the line from the design product, not the plain mug.
  await added.getByRole("link", { name: "Go to cart" }).click();
  await expect(ep).toHaveURL(/\/cart$/);
  await expect(ep.getByText("1,899").first()).toBeVisible();
  // The line is titled with the design, with the product beneath it.
  await expect(ep.getByTestId("line-title")).toHaveText("Happy Birthday");
  await editorCtx.close();
});

test("a design whose photo is artwork can be bought as it is", async ({
  page,
}) => {
  await signInEditor(page);
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page.getByTestId("image-input").setInputFiles({
    name: "art.png",
    mimeType: "image/png",
    buffer: await makePng(page, 2000, 1000),
  });
  await expect(page.getByRole("button", { name: "Replace" })).toBeVisible();
  await page.getByRole("link", { name: /Preview/ }).click();
  await page
    .getByRole("button", { name: "Publish as product" })
    .first()
    .click();
  const pub = page.getByRole("dialog", { name: "Publish as product" });
  await pub.getByLabel("Name").fill("Lantern art");
  await pub.getByLabel("Description").fill("Artwork mug.");
  await pub.getByLabel("Price (Rs)").fill("1599");
  await pub.getByRole("button", { name: "Publish product" }).click();
  await expect(page.getByTestId("template-saved")).toContainText(
    "Product saved",
  );
  await page.getByRole("link", { name: "View the product page" }).click();
  // Under load the first tap can land before the page is interactive: retry.
  await expect(async () => {
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByTestId("added-to-cart")).toContainText(
      "Added to your cart",
      { timeout: 4000 },
    );
  }).toPass({ timeout: 20_000 });
  await page.getByRole("link", { name: "Go to cart" }).click();
  await expect(page.getByTestId("line-title")).toHaveText("Lantern art");
  await expect(page.getByText("1,599").first()).toBeVisible();
});
