import { expect, test, type Page } from "@playwright/test";

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

// Playwright starts the server with TEMPLATE_EDITOR_EMAILS=template-editor@example.pk.
const EDITOR = "template-editor@example.pk";

test("a template editor saves a template; a customer starts from it and must replace the sample photo", async ({
  page,
}) => {
  // Guests and ordinary customers get no "Save as template".
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Save as template" }),
  ).toHaveCount(0);

  // Sign up as the listed editor.
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Template Editor");
  await page.getByLabel("Email").fill(EDITOR);
  await page.locator("#su-password").fill("correct horse");
  await page.getByRole("button", { name: "Create account" }).tap();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page.getByTestId("image-input").setInputFiles({
    name: "sample.png",
    mimeType: "image/png",
    buffer: await makePng(page, 1600, 1200),
  });
  await page.getByRole("button", { name: "Save as template" }).click();
  const sheet = page.getByRole("dialog", { name: "Save as template" });
  await sheet.getByLabel("Name").fill("Eid card");
  await sheet.getByText("Eid", { exact: true }).click();
  await sheet.getByLabel("Publish (visible to customers)").check();
  await sheet.getByRole("button", { name: "Save template" }).click();
  const saved = page.getByTestId("template-saved");
  await expect(saved).toContainText("Template saved");
  const id = (await saved.locator("code").textContent())!;

  // The gallery pages show it straight away (thumbnail + name), and the
  // occasion tile opens it in the editor.
  // Saving a template expires the cached gallery pages.
  for (const u of ["/occasions/eid", "/products/mug"]) {
    await expect
      .poll(
        async () =>
          (await (await page.request.get(u)).text()).includes("Eid card"),
        { timeout: 15_000 },
      )
      .toBe(true);
  }
  await page.goto("/products/mug");
  const card = page
    .getByTestId("template-grid")
    .getByRole("link", { name: /Eid card/ });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toBeVisible();
  await page.goto("/occasions/eid");
  await expect(
    page.getByTestId("template-grid").getByRole("link", { name: /Eid card/ }),
  ).toBeVisible();
  await page.goto("/occasions/birthday");
  await expect(page.getByTestId("no-templates")).toBeVisible();
  // The editor already has this editor's own draft: accept "replace it?".
  page.once("dialog", (d) => void d.accept());
  await page.goto("/occasions/eid");
  await page.getByRole("link", { name: /Eid card/ }).click();
  await expect(page).toHaveURL(/\/design\/mug/);
  await expect(page.getByTestId("placeholder-hint")).toBeVisible();

  // A different browser context = a customer with an empty draft.
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
