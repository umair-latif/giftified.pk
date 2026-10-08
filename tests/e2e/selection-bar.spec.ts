import { expect, test, type Page } from "@playwright/test";
import { FONTS } from "@/config/fonts";
import {
  canvasBox,
  centreText,
  openEditorWithText,
  readout,
  status,
} from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

const bar = (page: Page) => page.getByTestId("selection-bar");
const fontButton = (page: Page) => bar(page).getByTestId("font-button");
async function pickFont(page: Page, label: string) {
  await fontButton(page).click();
  await page
    .getByTestId("font-panel")
    .getByRole("button", { name: label, exact: true })
    .click();
  await expect(page.getByTestId("font-panel")).toHaveCount(0);
}

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

  // New text starts bold (see engine/text.ts).
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect(italic).toHaveAttribute("aria-pressed", "false");

  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await italic.click();
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  await underline.click();
  await expect(underline).toHaveAttribute("aria-pressed", "true");
  await pickFont(page, "Serif");
  await expect(fontButton(page)).toHaveAccessibleName("Font: Serif");

  // Undo restores the last change first; the restore clears the selection, so reselect.
  const { cx, cy } = await canvasBox(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Redo" })).toBeEnabled();
  await page.mouse.click(cx, cy);
  await expect(fontButton(page)).toHaveAccessibleName("Font: Sans");
  await expect(
    bar(page).getByRole("button", { name: "Underline" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("text: fonts without a real bold/italic face disable (and drop) those styles", async ({
  page,
}) => {
  await openEditorWithText(page);
  const bold = bar(page).getByRole("button", { name: "Bold" });
  const italic = bar(page).getByRole("button", { name: "Italic" });

  await italic.click();
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  // Caveat has bold but no italic: italic is dropped and disabled.
  await pickFont(page, "Handwritten");
  await expect(italic).toHaveAttribute("aria-pressed", "false");
  await expect(italic).toBeDisabled();
  await expect(bold).toBeEnabled();
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  // Urdu (Nastaliq) has neither.
  await pickFont(page, "اردو");
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await expect(bold).toBeDisabled();
  await expect(italic).toBeDisabled();
  // Back to a font with every face: both toggles work again.
  await pickFont(page, "Elegant");
  await expect(bold).toBeEnabled();
  await italic.click();
  await expect(italic).toHaveAttribute("aria-pressed", "true");
});

test("font panel: shows the text in every font, in the face it would get", async ({
  page,
}) => {
  await openEditorWithText(page);
  await fontButton(page).click();
  const panel = page.getByTestId("font-panel");
  await expect(panel).toBeVisible();
  const options = panel.getByTestId("font-option");
  await expect(options).toHaveCount(FONTS.length);
  // The current font is marked.
  await expect(
    panel.getByRole("button", { name: "Sans", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // Each row draws the customer's text in its own font; Urdu shows a sample.
  const previews = panel.getByTestId("font-preview");
  const families = await previews.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).fontFamily),
  );
  expect(new Set(families).size).toBe(FONTS.length);
  const elegant = panel
    .getByRole("button", { name: "Elegant", exact: true })
    .getByTestId("font-preview");
  // New text starts as "Your text" (engine/text.ts): the row shows it.
  await expect(elegant).toHaveText("Your text");
  await expect(
    panel
      .getByRole("button", { name: "اردو", exact: true })
      .getByTestId("font-preview"),
  ).toHaveText("اردو میں لکھیں");
  // New text is bold, so the Handwritten preview is bold too.
  await expect(
    panel
      .getByRole("button", { name: "Handwritten", exact: true })
      .getByTestId("font-preview"),
  ).toHaveCSS("font-weight", "700");
  // The fonts really load (not a fallback).
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fonts.check("bold 20px 'Giftified Playfair'"),
      ),
    )
    .toBe(true);
  // Escape closes without changing anything.
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(fontButton(page)).toHaveAccessibleName("Font: Sans");
});

test("copy makes a second layer 5 mm down-right, delete removes the selection", async ({
  page,
}) => {
  await openEditorWithText(page);
  await bar(page).getByRole("button", { name: "Copy" }).click();
  await expect(status(page)).toContainText(centreText(5, 5));
  await bar(page).getByRole("button", { name: "Delete" }).click();
  await expect(status(page)).toHaveText(/1 layer\b/);
});

test("photo: crop to a square, reopen, and reset", async ({ page }) => {
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page.getByTestId("image-input").setInputFiles({
    name: "wide.png",
    mimeType: "image/png",
    buffer: await makePng(page, 3000, 1200),
  });
  await expect(bar(page)).toHaveAttribute("aria-label", "Photo tools");
  await expect(bar(page).getByRole("button", { name: "Bold" })).toHaveCount(0);
  const before = await readout(page);
  expect(before.w).toBeGreaterThan(before.x); // wide

  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
  const dialog = page.getByRole("dialog", { name: "Crop and frame photo" });
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
  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
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
  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
  await dialog.getByRole("radio", { name: "Square" }).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(status(page)).toHaveText(
    new RegExp(` ${before.w} × ${Math.round((before.w * 1200) / 3000)} mm`),
  );
});

test("crop & shape: pick a shape, it is remembered, and Replace keeps the frame", async ({
  page,
}) => {
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page.getByTestId("image-input").setInputFiles({
    name: "wide.png",
    mimeType: "image/png",
    buffer: await makePng(page, 3000, 1200),
  });
  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
  const dialog = page.getByRole("dialog", { name: "Crop and frame photo" });
  await expect(dialog.getByRole("radio", { name: "No shape" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("radio", { name: "Circle" }).click();
  // A circle needs a square frame.
  await expect(dialog.getByRole("radio", { name: "Square" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("button", { name: "Done" }).click();

  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
  await expect(dialog.getByRole("radio", { name: "Circle" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // Polaroid: square photo with a white border, slightly tilted.
  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
  await dialog.getByRole("radio", { name: "Polaroid" }).click();
  await expect(dialog.getByTestId("polaroid-border")).toBeVisible();
  // A ring, not a white slab: the photo stays visible inside the border.
  await expect(dialog.getByTestId("polaroid-border")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(status(page)).toHaveText(/357°/);
  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
  await expect(dialog.getByRole("radio", { name: "Polaroid" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await dialog.getByRole("radio", { name: "Circle" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(status(page)).toHaveText(/ 0°/); // tilt undone

  // Replace: a different photo goes into the same square frame.
  const before = await readout(page);
  await bar(page).getByRole("button", { name: "Replace" }).click();
  await page.getByTestId("image-input").setInputFiles({
    name: "tall.png",
    mimeType: "image/png",
    buffer: await makePng(page, 1200, 3000),
  });
  await expect(status(page)).toHaveText(
    new RegExp(` ${before.w} × ${before.w} mm`),
  );
});

test("crop survives reload (saved in the draft)", async ({ page }) => {
  await page.goto("/design/mug");
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
  await page.getByTestId("image-input").setInputFiles({
    name: "wide.png",
    mimeType: "image/png",
    buffer: await makePng(page, 3000, 1200),
  });
  await bar(page).getByRole("button", { name: "Crop & frames" }).click();
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

test("text colour: swatches, custom colour, one undo step each, and the bar fits 360 px", async ({
  page,
}) => {
  await openEditorWithText(page);
  const row = page.getByTestId("selection-bar-row");
  const fits = await row.evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(fits).toBe(true);

  const colourButton = bar(page).getByRole("button", { name: "Text colour" });
  const panel = page.getByTestId("colour-panel");

  await colourButton.click();
  await expect(panel.getByRole("button", { name: "Black" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await panel.getByRole("button", { name: "Red" }).click();
  await expect(panel).toHaveCount(0); // closes after picking

  await colourButton.click();
  await expect(panel.getByRole("button", { name: "Red" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Custom colour commits once when the native picker closes.
  await panel.getByLabel("Custom colour").fill("#123456");
  await expect(panel).toHaveCount(0);
  await colourButton.click();
  await expect(panel.getByRole("button", { name: "Red" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // Tapping outside closes the panel without changes.
  const main = (await page.getByTestId("editor-main").boundingBox())!;
  await page.mouse.click(main.x + 5, main.y + 5);
  await expect(panel).toHaveCount(0);

  // Undo goes back to red (one step), then black.
  const { cx, cy } = await canvasBox(page);
  const undo = page.getByRole("button", { name: "Undo" });
  await undo.click();
  await expect(page.getByRole("button", { name: "Redo" })).toBeEnabled();
  await page.mouse.click(cx, cy);
  await bar(page).getByRole("button", { name: "Text colour" }).click();
  await expect(panel.getByRole("button", { name: "Red" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("text colour: type a colour code", async ({ page }) => {
  await openEditorWithText(page);
  const colourButton = bar(page).getByRole("button", { name: "Text colour" });
  const panel = page.getByTestId("colour-panel");
  const field = panel.getByLabel("Colour code");

  await colourButton.click();
  await expect(field).toHaveValue("111827"); // current colour (black)

  // Enter applies a valid code and closes the panel.
  await field.fill("#1d4ed8");
  await field.press("Enter");
  await expect(panel).toHaveCount(0);
  await colourButton.click();
  await expect(field).toHaveValue("1D4ED8");
  await expect(panel.getByRole("button", { name: "Blue" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Invalid codes are flagged and nothing changes.
  await field.fill("zz12");
  await panel.getByRole("button", { name: "Apply" }).click();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(panel).toBeVisible();

  // Short codes are expanded.
  await field.fill("f0a");
  await panel.getByRole("button", { name: "Apply" }).click();
  await expect(panel).toHaveCount(0);
  await colourButton.click();
  await expect(field).toHaveValue("FF00AA");
});
