import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test("preview is a gallery of mockups (no flat design): front, left, right, lifestyle and flat lay", async ({
  page,
}) => {
  const doc: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  );
  await page.addInitScript((d) => {
    localStorage.setItem("giftified:draft:mug", JSON.stringify(d));
  }, doc);
  await page.goto("/design/mug/preview");

  await expect(page.getByTestId("preview-gallery")).toBeVisible();
  // The flat design lives on the Design screen only.
  await expect(page.getByTestId("preview-frame")).toBeHidden();
  await expect(page.getByRole("tablist")).toHaveCount(0);

  for (const [id, label] of [
    ["front", "front"],
    ["left", "left"],
    ["right", "right"],
    ["lifestyle", "lifestyle"],
    ["flatlay", "flat lay"],
  ] as const) {
    await page.getByTestId(`preview-thumb-${id}`).click();
    await expect(page.getByTestId(`preview-thumb-${id}`)).toHaveAttribute(
      "aria-current",
      "true",
    );
    const main = page.getByTestId("preview-mockup").getByRole("img");
    await expect(main).toHaveAttribute("alt", new RegExp(label, "i"));
    await expect(main).toHaveAttribute("src", /^data:image\//);
    await page.getByTestId("preview-mockup").screenshot({
      path: `test-results/mockup-${id}.png`,
    });
  }
});

test("t-shirt preview is a gallery of white-tee photos, the editor shirt first", async ({
  page,
}) => {
  await page.goto("/design/tshirt");
  await page.getByRole("button", { name: "Text", exact: true }).tap();
  await expect(page.getByTestId("editor-status")).toContainText("textbox");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();

  await expect(page.getByTestId("preview-gallery")).toBeVisible();
  const main = page.getByTestId("preview-mockup").getByRole("img");
  await expect(main).toHaveAttribute("alt", /front/i);
  await expect(page.getByTestId("preview-thumb-front")).toHaveAttribute(
    "aria-current",
    "true",
  );
  for (const id of ["front", "window", "studio", "closeup"]) {
    await page.getByTestId(`preview-thumb-${id}`).click();
    await expect(main).toHaveAttribute("src", /^data:image\//);
    await page.getByTestId("preview-mockup").screenshot({
      path: `test-results/tshirt-mockup-${id}.png`,
    });
  }
});

test("preview gallery: arrows and swiping move between views", async ({
  page,
}) => {
  const doc: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  );
  await page.addInitScript((d) => {
    localStorage.setItem("giftified:draft:mug", JSON.stringify(d));
  }, doc);
  await page.goto("/design/mug/preview");
  const current = (id: string) =>
    expect(page.getByTestId(`preview-thumb-${id}`)).toHaveAttribute(
      "aria-current",
      "true",
    );
  // Mug views run right, front, left, lifestyle, flat lay.
  await current("right");
  // Arrows show on a phone too; none before the first picture.
  await expect(page.getByTestId("preview-prev")).toBeHidden();
  await page.getByTestId("preview-next").tap();
  await current("front");
  await page.getByTestId("preview-prev").tap();
  await current("right");

  // Swipe left (drag) on the picture -> next view; swipe right -> back.
  const box = (await page.getByTestId("preview-mockup").boundingBox())!;
  const y = box.y + box.height / 2;
  const drag = async (from: number, to: number) => {
    await page.mouse.move(box.x + box.width * from, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * to, y, { steps: 5 });
    await page.mouse.up();
  };
  await drag(0.8, 0.2);
  await current("front");
  await drag(0.2, 0.8);
  await current("right");
});

test("black mug: black canvas in the editor, black photos in the preview, Rs 1,000 in the cart", async ({
  page,
}) => {
  await page.goto("/design/mug");
  await expect(page.getByTestId("colour-white")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByTestId("colour-black").tap();
  await expect(page.getByTestId("colour-picker")).toContainText(
    "Mug colour: Gloss Black",
  );
  await page.getByRole("button", { name: "Text", exact: true }).tap();
  await expect(page.getByTestId("editor-status")).toContainText("textbox");
  await page.getByRole("link", { name: "Preview", exact: true }).tap();

  await expect(page.getByTestId("preview-colour")).toContainText("Black");
  // Only the black photos: the three studio views, in hand, on the table.
  for (const id of [
    "front-black",
    "left-black",
    "right-black",
    "hand-black",
    "table-black",
  ]) {
    await page.getByTestId(`preview-thumb-${id}`).click();
    const main = page.getByTestId("preview-mockup").getByRole("img");
    await expect(main).toHaveAttribute("src", /^data:image\//);
    await page.getByTestId("preview-mockup").screenshot({
      path: `test-results/mockup-mug-${id}.png`,
    });
  }
  await expect(page.getByTestId("preview-thumb-front")).toHaveCount(0);
  await expect(page.getByTestId("preview-thumb-lifestyle")).toHaveCount(0);

  await page
    .getByRole("button", { name: "Add to cart" })
    .filter({ visible: true })
    .first()
    .tap();
  await expect(page).toHaveURL(/\/cart$/);
  const line = page.getByTestId("cart-line");
  await expect(line).toContainText("Gloss Black");
  await expect(line.getByTestId("line-price")).toHaveText("Rs 1,000");
});

test("preview photos: Download gives the branded JPEG; Share hands it to the phone's share sheet", async ({
  page,
}) => {
  // Headless Chromium has no share sheet: stand in for the phone's.
  await page.addInitScript(() => {
    const w = window as unknown as {
      __shared?: { name: string; type: string; size: number; text?: string };
    };
    Object.assign(navigator, {
      canShare: (d: ShareData) => !!d.files?.length,
      share: async (d: ShareData) => {
        const f = d.files![0]!;
        w.__shared = { name: f.name, type: f.type, size: f.size, text: d.text };
      },
    });
  });
  const doc: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  );
  await page.addInitScript((d) => {
    localStorage.setItem("giftified:draft:mug", JSON.stringify(d));
  }, doc);
  await page.goto("/design/mug/preview");
  const main = page.getByTestId("preview-mockup").getByRole("img").first();
  await expect(main).toHaveAttribute("src", /^data:image\//);

  // Download: a JPEG named after the product and view.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("photo-download").click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^designbanana-custom-mug-[a-z-]+\.jpg$/,
  );
  const bytes = readFileSync((await download.path())!);
  expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // JPEG
  expect(bytes.length).toBeGreaterThan(10_000);

  // Share: the photo goes to the share sheet with a line of text and the link.
  await page.getByTestId("photo-share").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as { __shared?: unknown }).__shared),
    )
    .toMatchObject({
      type: "image/jpeg",
      name: expect.stringMatching(/^designbanana-custom-mug-.+\.jpg$/),
      text: expect.stringContaining("/products/mug"),
    });
});

test("no Share button where the browser can't share photos; Download stays", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.assign(navigator, { canShare: () => false });
  });
  const doc: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  );
  await page.addInitScript((d) => {
    localStorage.setItem("giftified:draft:mug", JSON.stringify(d));
  }, doc);
  await page.goto("/design/mug/preview");
  await expect(page.getByTestId("photo-download")).toBeVisible();
  await expect(page.getByTestId("photo-share")).toHaveCount(0);
});
