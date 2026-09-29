import { expect, test, type Browser, type Page } from "@playwright/test";
import { canvasBox, openEditorWithText, signInEditor, status } from "./helpers";

async function publishCurrentDesign(page: Page, name: string) {
  await page.getByRole("button", { name: "Save as template" }).click();
  const sheet = page.getByRole("dialog", { name: "Save as template" });
  await sheet.getByLabel("Name").fill(name);
  await sheet.getByLabel("Publish (visible to customers)").check();
  await sheet.getByRole("button", { name: "Save template" }).click();
  const saved = page.getByTestId("template-saved");
  await expect(saved).toContainText("Template saved");
  return (await saved.locator("code").textContent())!;
}

/** A customer (empty draft) starts from the template and taps the middle of the print area. */
async function tapAsCustomer(browser: Browser, id: string, base: string) {
  const ctx = await browser.newContext({
    baseURL: base,
    viewport: { width: 360, height: 740 },
    hasTouch: true,
    isMobile: true,
  });
  const cp = await ctx.newPage();
  await cp.goto(`/design/mug?template=${id}`);
  await expect(status(cp)).toContainText("1 layer");
  const { cx, cy } = await canvasBox(cp);
  await cp.touchscreen.tap(cx, cy);
  return { cp, ctx };
}

test("layers are locked unless the designer marks them customizable", async ({
  page,
  browser,
  baseURL,
}) => {
  await signInEditor(page);

  // A: text left locked (the default).
  await openEditorWithText(page);
  const locked = await publishCurrentDesign(page, "Locked text");

  // B: the same text marked "Customers can edit".
  await page.goto("/design/mug");
  await expect(status(page)).toContainText("1 layer");
  const box = await canvasBox(page);
  await page.touchscreen.tap(box.cx, box.cy);
  await page
    .getByTestId("selection-bar")
    .getByRole("button", { name: "Customers can edit" })
    .click();
  await expect(status(page)).toContainText("customers can edit");
  const open = await publishCurrentDesign(page, "Editable text");

  const a = await tapAsCustomer(browser, locked, baseURL!);
  await expect(status(a.cp)).toContainText("1 layer"); // tap selected nothing
  await expect(a.cp.getByTestId("selection-bar")).toHaveCount(0);
  await a.ctx.close();

  const b = await tapAsCustomer(browser, open, baseURL!);
  await expect(status(b.cp)).toContainText("textbox (customers can edit)");
  await b.ctx.close();
});
