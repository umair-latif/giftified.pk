import { expect, test, type Page } from "@playwright/test";

const status = (page: Page) => page.getByTestId("editor-status");

async function centre(page: Page): Promise<{ x: number; y: number; w: number; angle: string }> {
  const text = (await status(page).textContent()) ?? "";
  const m = text.match(/centre (\d+), (\d+) mm · (\d+) ×/);
  expect(m, `unexpected status: ${text}`).not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2]), w: Number(m![3]), angle: text };
}

test("mug editor: add, drag, pinch, delete on a 360px phone", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/design/mug");
  await expect(page.getByRole("heading", { name: "Custom Mug" })).toBeVisible();
  await expect(status(page)).toHaveText(/0 layers/);

  // No horizontal page scroll at 360px.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(360);

  await page.getByRole("button", { name: "Text" }).click();
  await expect(status(page)).toHaveText(/textbox · centre 108, 45 mm/);

  // Drag the text right by 60 CSS px.
  const upper = page.locator("canvas.upper-canvas");
  const box = (await upper.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy, { steps: 5 });
  await page.mouse.move(cx + 60, cy, { steps: 5 });
  await page.mouse.up();
  const afterDrag = await centre(page);
  expect(afterDrag.x).toBeGreaterThan(120);

  // Dragging far off-canvas keeps the centre on the print area.
  const now = afterDrag.x * (box.width / 216) + box.x;
  await page.mouse.move(now, cy);
  await page.mouse.down();
  await page.mouse.move(now + 800, cy + 800, { steps: 10 });
  await page.mouse.up();
  const clamped = await centre(page);
  expect(clamped.x).toBeLessThanOrEqual(216);
  expect(clamped.y).toBeLessThanOrEqual(89);

  // Back to the middle for the pinch.
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(status(page)).toHaveText(/0 layers/);
  await page.getByRole("button", { name: "Text" }).click();
  await expect(status(page)).toHaveText(/textbox · centre 108, 45 mm/);
  const before = await centre(page);

  // Two-finger pinch-out + twist via raw CDP touch events.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, pts: { x: number; y: number }[]) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: pts.map((p, id) => ({ ...p, id })),
    } as never);
  await touch("touchStart", [
    { x: cx - 20, y: cy },
    { x: cx + 20, y: cy },
  ]);
  for (let i = 1; i <= 5; i++) {
    const r = 20 + i * 6;
    const a = (i * 4 * Math.PI) / 180;
    await touch("touchMove", [
      { x: cx - r * Math.cos(a), y: cy - r * Math.sin(a) },
      { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) },
    ]);
  }
  await touch("touchEnd", []);
  await expect.poll(async () => (await centre(page)).w).toBeGreaterThan(before.w * 1.3);
  const after = await centre(page);
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Delete" }).click();
  await expect(status(page)).toHaveText(/0 layers/);
  expect(errors).toEqual([]);
});

test("unknown products 404", async ({ page }) => {
  const res = await page.goto("/design/sofa");
  expect(res?.status()).toBe(404);
});
