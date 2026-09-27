import { expect, test, type Page } from "@playwright/test";
import { canvasBox, pinch, status } from "./helpers";

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

/** Makes a PNG of the given size in the browser (a gradient so it's visible). */
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
      const g = ctx.createLinearGradient(0, 0, w!, h!);
      g.addColorStop(0, "#f97316");
      g.addColorStop(1, "#4f46e5");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w!, h!);
      return c.toDataURL("image/png");
    },
    [width, height],
  );
  return Buffer.from(dataUrl.split(",")[1]!, "base64");
}

async function upload(
  page: Page,
  name: string,
  buffer: Buffer,
  mimeType = "image/png",
) {
  await page
    .getByTestId("image-input")
    .setInputFiles({ name, mimeType, buffer });
}

const badge = (page: Page) => page.getByTestId("dpi-badge");

async function openEditor(page: Page) {
  await page.goto("/design/mug");
  await expect(status(page)).toHaveText(/0 layers/);
  // Tools are enabled only once the canvas engine has loaded.
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
}

test("a large photo prints sharp, and enlarging it too much turns the badge red", async ({
  page,
}) => {
  await openEditor(page);
  await upload(page, "big.png", await makePng(page, 3000, 1200));
  await expect(status(page)).toHaveText(/image · centre 108, 45 mm/);
  await expect(badge(page)).toHaveAttribute("data-status", "ok");
  await expect(badge(page)).toContainText(/Sharp print · \d+ DPI/);

  const { cx, cy } = await canvasBox(page);
  await pinch(page, cx, cy, { fromRadius: 15, toRadius: 60, degrees: 0 });
  await expect(badge(page)).toHaveAttribute("data-status", "block");
  await expect(badge(page)).toContainText("Too blurry to print");

  // Deselect: the editor still warns about the design as a whole.
  const main = (await page.getByTestId("editor-main").boundingBox())!;
  await page.mouse.click(main.x + main.width / 2, main.y + main.height - 10);
  await expect(status(page)).toHaveText(/1 layer\b/);
  await expect(page.getByTestId("quality-warning")).toContainText("too blurry");

  // Undo the pinch → sharp again.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Redo" })).toBeEnabled(); // restore finished
  // A finger tap, like a phone. (Fabric ignores mouse input for 400 ms after a touch gesture.)
  await page.touchscreen.tap(cx, cy);
  await expect(badge(page)).toHaveAttribute("data-status", "ok");
});

test("a small photo starts at the largest size that still prints at 200 DPI", async ({
  page,
}) => {
  await openEditor(page);
  await upload(page, "small.png", await makePng(page, 500, 500));
  await expect(badge(page)).toHaveAttribute("data-status", "ok");
  // 500 px at 200 DPI = 2.5 in = 63.5 mm
  await expect(status(page)).toHaveText(/ 64 × 64 mm/);
  await expect(badge(page)).toContainText("200 DPI");
});

test("unsupported files show a friendly message", async ({ page }) => {
  await openEditor(page);
  await upload(page, "anim.gif", Buffer.from("GIF89a"), "image/gif");
  await expect(page.getByTestId("editor-notice")).toContainText(
    "JPG, PNG or WebP",
  );
  await page.getByRole("button", { name: "OK" }).click();
  await expect(page.getByTestId("editor-notice")).toHaveCount(0);
  await expect(status(page)).toHaveText(/0 layers/);
  // Tools are enabled only once the canvas engine has loaded.
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
});

test("photos survive reload and appear on the preview with their quality", async ({
  page,
}) => {
  await openEditor(page);
  await upload(page, "big.png", await makePng(page, 3000, 1200));
  await expect(badge(page)).toHaveAttribute("data-status", "ok");

  // The saved draft references the photo by id, never by blob:/data: URL.
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("giftified:draft:mug") ?? ""),
    )
    .toMatch(/"src":"asset:[0-9a-f-]+"/);
  const draft = await page.evaluate(
    () => localStorage.getItem("giftified:draft:mug") ?? "",
  );
  expect(draft).not.toMatch(/blob:|data:image/);

  await page.reload();
  await expect(status(page)).toHaveText(/1 layer\b/);
  const { cx, cy } = await canvasBox(page);
  await page.mouse.click(cx, cy);
  await expect(badge(page)).toHaveAttribute("data-status", "ok");

  await page.getByRole("link", { name: "Next" }).click();
  await expect(page.getByTestId("preview-quality")).toContainText("Sharp");
  await expect(
    page.getByRole("img", { name: /Custom Mug design/ }),
  ).toBeVisible();
});

test("undo removes an added photo", async ({ page }) => {
  await openEditor(page);
  await upload(page, "big.png", await makePng(page, 1600, 1600));
  await expect(status(page)).toHaveText(/image ·/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(status(page)).toHaveText(/0 layers/);
  // Tools are enabled only once the canvas engine has loaded.
  await expect(
    page.getByRole("button", { name: "Image", exact: true }),
  ).toBeEnabled();
});

test("uploads work on plain-HTTP pages without crypto.randomUUID (phone on LAN IP)", async ({
  page,
}) => {
  // localhost is a secure context; simulate http://192.168.x.x where randomUUID is missing.
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
  });
  await openEditor(page);
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");
  await upload(page, "big.png", await makePng(page, 1600, 1600));
  await expect(badge(page)).toHaveAttribute("data-status", "ok");
  await expect(page.getByTestId("editor-notice")).toHaveCount(0);
});
