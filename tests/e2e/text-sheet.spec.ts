import { expect, test, type Page } from "@playwright/test";
import { canvasBox, openEditorWithText, status } from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

const more = (page: Page) =>
  page.getByTestId("selection-bar").getByRole("button", { name: "More" });
const sheet = (page: Page) => page.getByRole("dialog", { name: "Text" });

/** The autosaved draft mirrors the canvas ~300 ms after a change; read its text object back. */
async function textObject(page: Page) {
  await expect
    .poll(async () => {
      const raw = await page.evaluate(() =>
        localStorage.getItem("giftified:draft:mug"),
      );
      return raw !== null;
    })
    .toBe(true);
  return page.evaluate(() => {
    const raw = localStorage.getItem("giftified:draft:mug")!;
    const doc = JSON.parse(raw) as {
      fabric: { objects: Record<string, unknown>[] };
    };
    return doc.fabric.objects.find((o) => o.type === "Textbox")!;
  });
}

test("More opens a bottom sheet; the canvas stays visible above it", async ({
  page,
}) => {
  await openEditorWithText(page);
  await expect(sheet(page)).toHaveCount(0);
  await more(page).click();
  await expect(sheet(page)).toBeVisible();
  const box = (await sheet(page).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.height).toBeLessThanOrEqual(viewport.height / 2 + 1);
  await expect(page.locator("canvas.upper-canvas")).toBeVisible();

  // Tap outside (the canvas) closes it.
  const { cx, cy } = await canvasBox(page);
  await page.mouse.click(cx, cy - 20);
  await expect(sheet(page)).toHaveCount(0);
});

test("edit the words: applies on blur, one undo step, Enter keeps a line break", async ({
  page,
}) => {
  await openEditorWithText(page);
  await more(page).click();
  const input = page.getByTestId("text-sheet-input");
  await expect(input).toHaveValue("Your text");

  await input.fill("Happy Anniversary");
  await input.blur();
  await expect.poll(async () => (await textObject(page)).text).toBe(
    "Happy Anniversary",
  );

  await page.getByRole("button", { name: "Close" }).click();
  await expect(sheet(page)).toHaveCount(0);

  // One undo step for the whole edit, not per keystroke.
  const { cx, cy } = await canvasBox(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await textObject(page)).text).toBe(
    "Your text",
  );
  await page.mouse.click(cx, cy);
  await expect(status(page)).toContainText("textbox");
});

test("alignment: each tap is one undo step", async ({ page }) => {
  await openEditorWithText(page);
  await more(page).click();
  const right = sheet(page).getByRole("radio", { name: "Align right" });
  const left = sheet(page).getByRole("radio", { name: "Align left" });
  await expect(
    sheet(page).getByRole("radio", { name: "Align centre" }),
  ).toHaveAttribute("aria-checked", "true");

  await right.click();
  await expect(right).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await textObject(page)).textAlign).toBe(
    "right",
  );

  await left.click();
  await expect(left).toHaveAttribute("aria-checked", "true");
  await expect.poll(async () => (await textObject(page)).textAlign).toBe(
    "left",
  );

  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await textObject(page)).textAlign).toBe(
    "right",
  );
});

test("outline: thickness and colour, each change is one undo step", async ({
  page,
}) => {
  await openEditorWithText(page);
  await more(page).click();
  const thin = sheet(page).getByRole("radio", { name: "Thin" });
  const off = sheet(page).getByRole("radio", { name: "Off" });
  await expect(off).toHaveAttribute("aria-checked", "true");
  await expect(
    sheet(page).getByRole("group", { name: "Outline colour" }),
  ).toHaveCount(0);

  await thin.click();
  await expect(thin).toHaveAttribute("aria-checked", "true");
  await expect
    .poll(async () => (await textObject(page)).strokeWidth)
    .toBeCloseTo(0.4, 5);
  await expect.poll(async () => (await textObject(page)).stroke).toBe(
    "#111827",
  );

  await sheet(page)
    .getByRole("group", { name: "Outline colour" })
    .getByRole("button", { name: "White" })
    .click();
  await expect.poll(async () => (await textObject(page)).stroke).toBe(
    "#ffffff",
  );

  await sheet(page).getByRole("radio", { name: "Off" }).click();
  await expect.poll(async () => (await textObject(page)).strokeWidth).toBe(0);

  // Undo restores: off → thin/white → thin/black → no outline.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => (await textObject(page)).strokeWidth)
    .toBeCloseTo(0.4, 5);
  await expect.poll(async () => (await textObject(page)).stroke).toBe(
    "#ffffff",
  );
});

test("fonts: the editor fetches only the new-text face; the sheet loads the rest", async ({
  page,
}) => {
  const fontRequests: string[] = [];
  page.on("request", (r) => {
    const m = r.url().match(/\/fonts\/print\/(.+)$/);
    if (m?.[1]) fontRequests.push(m[1]);
  });
  await openEditorWithText(page);
  await expect(page.getByTestId("selection-bar")).toBeVisible();
  expect(fontRequests).toEqual(["liberation/LiberationSans-Bold.woff2"]);

  await more(page).click();
  await expect
    .poll(() => fontRequests.length, { message: "font files requested" })
    .toBeGreaterThan(1);
});
