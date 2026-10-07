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
