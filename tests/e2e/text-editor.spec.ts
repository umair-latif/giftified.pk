import { expect, test, type Page } from "@playwright/test";
import { openEditorWithText } from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

const more = (page: Page) =>
  page.getByTestId("selection-bar").getByRole("button", { name: "More" });
const editor = (page: Page) => page.getByRole("dialog", { name: "Edit text" });
const done = (page: Page) =>
  editor(page).getByRole("button", { name: "Done" }).click();

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

test("More opens the full-screen text editor; Cancel leaves the canvas as it was", async ({
  page,
}) => {
  await openEditorWithText(page);
  await expect(editor(page)).toHaveCount(0);
  await more(page).click();
  await expect(editor(page)).toBeVisible();
  const box = (await editor(page).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);

  const input = page.getByTestId("text-sheet-input");
  await expect(input).toHaveValue("Your text");
  await input.fill("Not this");
  // The preview follows as you type.
  await expect(page.getByTestId("text-editor-preview")).toHaveText("Not this");
  await editor(page).getByRole("button", { name: "Cancel" }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect
    .poll(async () => (await textObject(page)).text)
    .toBe("Your text");

  // Escape cancels too.
  await more(page).click();
  await input.fill("Nor this");
  await page.keyboard.press("Escape");
  await expect(editor(page)).toHaveCount(0);
  await expect
    .poll(async () => (await textObject(page)).text)
    .toBe("Your text");
});

test("Done applies words and formatting as one undo step; Enter keeps a line break", async ({
  page,
}) => {
  await openEditorWithText(page);
  await more(page).click();
  const input = page.getByTestId("text-sheet-input");
  await input.fill("Happy\nAnniversary");
  await editor(page).getByRole("radio", { name: "Align right" }).click();
  await editor(page).getByRole("radio", { name: "Thin" }).click();
  await editor(page)
    .getByRole("group", { name: "Outline colour" })
    .getByRole("button", { name: "White" })
    .click();
  await editor(page)
    .getByRole("group", { name: "Text colour" })
    .getByRole("button", { name: "Grey" })
    .click();
  await editor(page)
    .getByRole("group", { name: "Font" })
    .getByRole("button", { name: "Serif" })
    .click();
  await done(page);
  await expect(editor(page)).toHaveCount(0);

  await expect
    .poll(async () => (await textObject(page)).text)
    .toBe("Happy\nAnniversary");
  const t = await textObject(page);
  expect(t.textAlign).toBe("right");
  expect(t.stroke).toBe("#ffffff");
  expect(t.strokeWidth).toBeCloseTo(0.4, 5);
  expect(t.fill).toBe("#6b7280");
  expect(String(t.fontFamily)).toContain("Giftified Serif");

  // One undo step for the whole edit.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect
    .poll(async () => (await textObject(page)).text)
    .toBe("Your text");
  const u = await textObject(page);
  expect(u.textAlign).toBe("center");
  expect(u.stroke ?? null).toBeNull(); // no outline (Fabric keeps its default width)
});

test("Done with nothing changed adds no undo step", async ({ page }) => {
  await openEditorWithText(page);
  const undo = page.getByRole("button", { name: "Undo" });
  const wasEnabled = await undo.isEnabled();
  await more(page).click();
  await done(page);
  await expect(editor(page)).toHaveCount(0);
  expect(await undo.isEnabled()).toBe(wasEnabled);
});

test("bold and italic are offered only where the font has them", async ({
  page,
}) => {
  await openEditorWithText(page);
  await more(page).click();
  const bold = editor(page).getByRole("button", { name: "Bold" });
  await expect(bold).toBeEnabled();
  await editor(page)
    .getByRole("group", { name: "Font" })
    .getByRole("button", { name: "اردو", exact: true })
    .click();
  await expect(bold).toBeDisabled();
  await expect(
    editor(page).getByRole("button", { name: "Italic" }),
  ).toBeDisabled();
});

test("fonts: the editor fetches only the new-text face; the text editor loads the rest", async ({
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

test("Words: tapping in selects all; Clear empties it in one tap", async ({
  page,
}) => {
  await openEditorWithText(page);
  await more(page).click();
  const input = page.getByTestId("text-sheet-input");
  await input.tap();
  await expect
    .poll(() =>
      input.evaluate((el: HTMLTextAreaElement) => [
        el.selectionStart,
        el.selectionEnd,
      ]),
    )
    .toEqual([0, 9]);
  await editor(page).getByRole("button", { name: "Clear" }).tap();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(
    editor(page).getByRole("button", { name: "Clear" }),
  ).toBeDisabled();
  await input.fill("Eid Mubarak");
  await done(page);
  await expect
    .poll(async () => (await textObject(page)).text)
    .toBe("Eid Mubarak");
});

test("with the phone keyboard open the editor fits the visible part of the screen", async ({
  page,
}) => {
  await openEditorWithText(page);
  await more(page).click();
  const viewport = page.viewportSize()!;
  const visible = viewport.height - 300;
  // Simulate a 300 px keyboard: the visual viewport shrinks, the layout
  // viewport (where fixed elements live) does not.
  await page.evaluate((h) => {
    const vv = window.visualViewport!;
    Object.defineProperty(vv, "height", { configurable: true, get: () => h });
    vv.dispatchEvent(new Event("resize"));
  }, visible);
  await expect
    .poll(async () => {
      const b = (await editor(page).boundingBox())!;
      return Math.round(b.y + b.height);
    })
    .toBeLessThanOrEqual(visible + 1);
  // Done and the words stay above the keyboard.
  const doneBox = (await editor(page)
    .getByRole("button", { name: "Done" })
    .boundingBox())!;
  expect(doneBox.y + doneBox.height).toBeLessThanOrEqual(visible);
  const field = (await page.getByTestId("text-sheet-input").boundingBox())!;
  expect(field.y + field.height).toBeLessThanOrEqual(visible);
});

test("Back closes the text editor (like Cancel) and stays in the designer", async ({
  page,
}) => {
  await page.goto("/"); // so there is a page to go back to
  await openEditorWithText(page);
  await more(page).tap();
  await expect(editor(page)).toBeVisible();

  await page.goBack();
  await expect(editor(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/design\/mug$/);
  // The text is still on the canvas, selected as before.
  await expect(more(page)).toBeVisible();

  // Back again now leaves the designer: the sheet left no entry behind.
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("closing the text editor with Cancel or Done leaves no extra history entry", async ({
  page,
}) => {
  await openEditorWithText(page);
  const before = await page.evaluate(() => history.length);
  const pathBefore = new URL(page.url()).pathname;

  await more(page).tap();
  await expect(editor(page)).toBeVisible();
  await editor(page).getByRole("button", { name: "Cancel" }).click();
  await expect(editor(page)).toHaveCount(0);
  // The entry is popped asynchronously: wait for it, then compare.
  await expect
    .poll(() => page.evaluate(() => history.state?.backOverlay))
    .toBeUndefined();
  expect(new URL(page.url()).pathname).toBe(pathBefore);

  await more(page).tap();
  await done(page);
  await expect
    .poll(() => page.evaluate(() => history.state?.backOverlay))
    .toBeUndefined();
  expect(new URL(page.url()).pathname).toBe(pathBefore);
  expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(
    before + 2, // popped entries stay in the "forward" list until replaced
  );
});
