import { expect, test, type Page } from "@playwright/test";
import { canvasBox, openEditorWithText, readout, status } from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

const bar = (page: Page) => page.getByTestId("selection-bar");

async function makePng(
  page: Page,
  width: number,
  height: number,
): Promise<Buffer> {
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

test("the bar appears only while something is selected", async ({ page }) => {
  await page.goto("/design/mug");
  await expect(status(page)).toHaveText(/0 layers/);
  await expect(bar(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Text", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toHaveAttribute("aria-label", "Text tools");

  const main = (await page.getByTestId("editor-main").boundingBox())!;
  await page.mouse.click(main.x + main.width / 2, main.y + main.height - 10);
  await expect(bar(page)).toHaveCount(0);
});

test("text: font, bold, italic, underline — each is one undo step", async ({
  page,
}) => {
  await openEditorWithText(page);
  const bold = bar(page).getByRole("button", { name: "Bold" });
  const italic = bar(page).getByRole("button", { name: "Italic" });
  const underline = bar(page).getByRole("button", { name: "Underline" });
  const font = bar(page).getByLabel("Font");

  // New text starts bold (see engine/text.ts).
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect(italic).toHaveAttribute("aria-pressed", "false");

  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await italic.click();
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  await underline.click();
  await expect(underline).toHaveAttribute("aria-pressed", "true");
  await font.selectOption({ label: "Serif" });
  await expect(font).toHaveValue(/Georgia/);

  // Undo restores the last change first; the restore clears the selection, so reselect.
  const { cx, cy } = await canvasBox(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Redo" })).toBeEnabled();
  await page.mouse.click(cx, cy);
  await expect(bar(page).getByLabel("Font")).toHaveValue(/Arial/);
  await expect(
    bar(page).getByRole("button", { name: "Underline" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("copy makes a second layer 5 mm down-right, delete removes the selection", async ({
  page,
}) => {
  await openEditorWithText(page);
  await bar(page).getByRole("button", { name: "Copy" }).click();
  await expect(status(page)).toHaveText(/centre 113, 50 mm/);
  await bar(page).getByRole("button", { name: "Delete" }).click();
  await expect(status(page)).toHaveText(/1 layer\b/);
});

test("photo: crop to a square, reopen, and reset", async ({ page }) => {
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page
    .getByTestId("image-input")
    .setInputFiles({
      name: "wide.png",
      mimeType: "image/png",
      buffer: await makePng(page, 3000, 1200),
    });
  await expect(bar(page)).toHaveAttribute("aria-label", "Photo tools");
  await expect(bar(page).getByRole("button", { name: "Bold" })).toHaveCount(0);
  const before = await readout(page);
  expect(before.w).toBeGreaterThan(before.x); // wide

  await bar(page).getByRole("button", { name: "Crop" }).click();
  const dialog = page.getByRole("dialog", { name: "Crop photo" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Original" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("radio", { name: "Square" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toHaveCount(0);

  // Same printed width, now square; fewer source pixels across it → lower DPI.
  await expect(status(page)).toHaveText(
    new RegExp(` ${before.w} × ${before.w} mm`),
  );
  const dpiText = (await page.getByTestId("dpi-badge").textContent()) ?? "";
  const dpi = Number(/(\d+) DPI/.exec(dpiText)?.[1]);
  expect(dpi).toBeLessThan(Math.round((3000 / before.w) * 25.4));

  // Reopen: the square shape is remembered. Zoom in with the slider, then reset.
  await bar(page).getByRole("button", { name: "Crop" }).click();
  await expect(dialog.getByRole("radio", { name: "Square" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByLabel("Zoom").fill("2");
  await dialog.getByRole("button", { name: "Reset" }).click();
  await expect(dialog.getByRole("radio", { name: "Original" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(status(page)).toHaveText(
    new RegExp(` ${before.w} × ${Math.round((before.w * 1200) / 3000)} mm`),
  );

  // Cancel leaves the photo untouched.
  await bar(page).getByRole("button", { name: "Crop" }).click();
  await dialog.getByRole("radio", { name: "Square" }).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(status(page)).toHaveText(
    new RegExp(` ${before.w} × ${Math.round((before.w * 1200) / 3000)} mm`),
  );
});

test("crop survives reload (saved in the draft)", async ({ page }) => {
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page
    .getByTestId("image-input")
    .setInputFiles({
      name: "wide.png",
      mimeType: "image/png",
      buffer: await makePng(page, 3000, 1200),
    });
  await bar(page).getByRole("button", { name: "Crop" }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "Square" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();
  const cropped = await readout(page);
  expect(cropped.w).toBeGreaterThan(0);

  await page.reload();
  await expect(status(page)).toHaveText(/1 layer\b/);
  const { cx, cy } = await canvasBox(page);
  await page.mouse.click(cx, cy);
  await expect(status(page)).toHaveText(
    new RegExp(` ${cropped.w} × ${cropped.w} mm`),
  );
});
