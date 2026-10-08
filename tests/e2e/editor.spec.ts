import { expect, test } from "@playwright/test";
import {
  AREA,
  CX,
  canvasBox,
  centreText,
  openEditorWithText,
  pinch,
  readout,
  status,
} from "./helpers";

// Fail any test that throws an uncaught error in the page.
let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

test("mug editor: add, drag, clamp, pinch, delete on a 360px phone", async ({
  page,
}) => {
  await openEditorWithText(page);

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);

  const { cx, cy, x: left, pxPerMm } = await canvasBox(page);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy, { steps: 5 });
  await page.mouse.move(cx + 60, cy, { steps: 5 });
  await page.mouse.up();
  const afterDrag = await readout(page);
  expect(afterDrag.x).toBeGreaterThan(120);

  const now = afterDrag.x * pxPerMm + left;
  await page.mouse.move(now, cy);
  await page.mouse.down();
  await page.mouse.move(now + 800, cy + 800, { steps: 10 });
  await page.mouse.up();
  const clamped = await readout(page);
  expect(clamped.x).toBeLessThanOrEqual(AREA.widthMm);
  expect(clamped.y).toBeLessThanOrEqual(AREA.heightMm);

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(status(page)).toHaveText(/0 layers/);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await expect(status(page)).toContainText(`textbox · ${centreText()}`);
  const before = await readout(page);

  await pinch(page, cx, cy, { fromRadius: 20, toRadius: 50, degrees: 20 });
  await expect
    .poll(async () => (await readout(page)).w)
    .toBeGreaterThan(before.w * 1.3);
  const after = await readout(page);
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
  expect(after.angle).toBe(20);

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(status(page)).toHaveText(/0 layers/);
});

test("undo / redo steps through add and move", async ({ page }) => {
  await openEditorWithText(page);
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });
  await expect(redo).toBeDisabled();

  const { cx, cy } = await canvasBox(page);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy, { steps: 8 });
  await page.mouse.up();
  const moved = await readout(page);
  expect(moved.x).toBeGreaterThan(120);

  await undo.click();
  await expect(status(page)).toHaveText(/1 layer\b/); // restore clears selection
  await undo.click();
  await expect(status(page)).toHaveText(/0 layers/);
  await expect(undo).toBeDisabled();

  await redo.click();
  await expect(status(page)).toHaveText(/1 layer\b/);
  await redo.click();
  await expect(redo).toBeDisabled();

  // The redone state has the text at the moved position: tap it to read it.
  const { x: left, pxPerMm } = await canvasBox(page);
  await page.mouse.click(left + moved.x * pxPerMm, cy);
  await expect(status(page)).toHaveText(/textbox/);
  expect((await readout(page)).x).toBe(moved.x);

  // Keyboard shortcut.
  await page.keyboard.press("Control+z");
  await expect(status(page)).toHaveText(/1 layer\b/);
});

test("centre guides light up and snap while dragging", async ({ page }) => {
  await openEditorWithText(page);
  const vGuide = page.getByTestId("guide-vertical");
  const { cx, cy, pxPerMm } = await canvasBox(page);

  // Move well away, then back to within a few px of centre.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 50, cy, { steps: 5 });
  await expect(vGuide).toHaveAttribute("data-active", "false");
  await page.mouse.move(cx + 4, cy, { steps: 5 });
  await expect(vGuide).toHaveAttribute("data-active", "true");
  await page.mouse.up();
  await expect(vGuide).toHaveAttribute("data-active", "false");
  expect((await readout(page)).x).toBe(CX);

  // Outside the 8px snap zone it stays where it was dropped.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 20, cy, { steps: 5 });
  await page.mouse.up();
  expect((await readout(page)).x).toBe(
    Math.round(AREA.widthMm / 2 + 20 / pxPerMm),
  );

  // Centre chip puts it back.
  await page.getByRole("button", { name: "Centre" }).click();
  await expect.poll(async () => (await readout(page)).x).toBe(CX);
});

test("rotation snaps level and Straighten resets it", async ({ page }) => {
  await openEditorWithText(page);
  const { cx, cy } = await canvasBox(page);
  const straighten = page.getByRole("button", { name: "Straighten" });

  // A small 3° twist snaps back to 0°.
  await pinch(page, cx, cy, { fromRadius: 30, toRadius: 30, degrees: 3 });
  await expect.poll(async () => (await readout(page)).angle).toBe(0);
  await expect(straighten).toBeDisabled();

  // 25° stays; Straighten fixes it.
  await pinch(page, cx, cy, { fromRadius: 30, toRadius: 30, degrees: 25 });
  await expect.poll(async () => (await readout(page)).angle).toBe(25);
  await straighten.click();
  await expect.poll(async () => (await readout(page)).angle).toBe(0);
});

test("back / next navigation keeps the design", async ({ page }) => {
  await openEditorWithText(page);
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(page).toHaveURL(/\/design\/mug\/preview$/);
  await expect(
    page.getByRole("img", { name: /Custom Mug, right view/ }),
  ).toBeVisible();
  await expect(page.getByTestId("preview-layers")).toHaveText("1");

  await page.getByRole("link", { name: "Back to editor" }).click();
  await expect(page).toHaveURL(/\/design\/mug$/);
  await expect(status(page)).toHaveText(/1 layer\b/);

  // Survives a full reload too.
  await page.reload();
  await expect(status(page)).toHaveText(/1 layer\b/);

  // Back from the editor goes to the product page, not the home page.
  await page.getByRole("link", { name: "Back to product" }).click();
  await expect(page).toHaveURL(/\/products\/mug$/);
});

test("unknown products 404", async ({ page }) => {
  const res = await page.goto("/design/sofa");
  expect(res?.status()).toBe(404);
});

test("a small element can be moved with its move handle without resizing it", async ({
  page,
}) => {
  await openEditorWithText(page);
  const { cx, cy, pxPerMm } = await canvasBox(page);
  // Shrink it until it is only a few finger-widths across.
  await pinch(page, cx, cy, { fromRadius: 24, toRadius: 4, degrees: 0 });
  await page.waitForTimeout(600); // Fabric ignores the mouse right after touch
  const before = await readout(page);
  expect(before.w * pxPerMm).toBeLessThan(84);
  // The handle sits just below the element (half its height + 30 px gap).
  const handleX = cx;
  const handleY = cy + (before.w * pxPerMm) / 4 + 30;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX + 40, handleY + 10, { steps: 6 });
  await page.mouse.up();
  const after = await readout(page);
  expect(after.x).toBeGreaterThan(before.x + 3);
  expect(after.w).toBe(before.w); // moved, not resized
});

test("the gesture tip shows once, until it is closed", async ({ page }) => {
  await page.goto("/design/mug");
  const tip = page.getByTestId("editor-tip");
  await expect(tip).toContainText("Two fingers");
  await tip.getByRole("button", { name: "Got it" }).tap();
  await expect(tip).toBeHidden();
  await page.reload();
  await expect(page.getByTestId("editor-status")).toBeVisible();
  await expect(tip).toBeHidden();
});

test("Centre and Straighten live in the selection bar", async ({ page }) => {
  await openEditorWithText(page);
  const bar = page.getByTestId("selection-bar");
  await expect(bar.getByRole("button", { name: "Centre" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Straighten" })).toBeDisabled();
});

test("Background colour fills the print area, prints with the design, and undoes", async ({
  page,
}) => {
  await openEditorWithText(page);
  const tools = page.getByRole("navigation", { name: "Editor tools" });
  await expect(tools.getByRole("button", { name: "Layers" })).toHaveCount(0);
  await expect(tools.getByRole("button", { name: "3D" })).toHaveCount(0);

  await tools.getByRole("button", { name: "Background colour" }).tap();
  const panel = page.getByTestId("background-panel");
  await panel.getByRole("button", { name: "Banana" }).tap();
  await expect(panel.getByRole("button", { name: "Banana" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Still one text layer: the background isn't counted or selectable.
  await page.keyboard.press("Escape");
  await expect(status(page)).toContainText("1 layer");

  // A canvas pixel near a corner (no text there) shows the colour.
  const { x, y } = await canvasBox(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>(
          "canvas.lower-canvas",
        )!;
        return [...c.getContext("2d")!.getImageData(3, 3, 1, 1).data];
      }),
    )
    .toEqual([0xff, 0xe1, 0x35, 255]);

  // Saved in the draft as the bottom layer, so it reaches preview and print.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("giftified:draft:mug");
        const objects = (
          JSON.parse(raw ?? "{}") as {
            fabric?: { objects?: { role?: string; fill?: string }[] };
          }
        ).fabric?.objects;
        return objects?.[0]?.role === "background" ? objects[0].fill : null;
      }),
    )
    .toBe("#ffe135");

  // Tapping where only the background is selects nothing.
  await page.touchscreen.tap(x + 6, y + 6);
  await expect(status(page)).toContainText("1 layer");

  // One undo step removes it.
  await page.getByRole("button", { name: "Undo" }).tap();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (localStorage.getItem("giftified:draft:mug") ?? "").includes(
          '"role":"background"',
        ),
      ),
    )
    .toBe(false);
});

test("typing into new text keeps it in place (no slide down per letter)", async ({
  page,
}) => {
  await openEditorWithText(page);
  const before = await readout(page);
  const { cx, cy } = await canvasBox(page);
  // Double-tap the text to type into it (the phone keyboard opens).
  await page.touchscreen.tap(cx, cy);
  await page.waitForTimeout(80);
  await page.touchscreen.tap(cx, cy);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.activeElement?.getAttribute("data-fabric") === "textarea",
      ),
    )
    .toBe(true);
  for (const ch of " Ayesha") {
    await page.keyboard.type(ch);
    // The box grows sideways but its centre stays on the same line.
    expect((await readout(page)).y).toBe(before.y);
  }
  expect((await readout(page)).w).toBeGreaterThan(before.w);
});
