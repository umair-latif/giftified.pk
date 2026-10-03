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
  for (const id of ["front", "studio", "closeup", "torso", "pointing"]) {
    await page.getByTestId(`preview-thumb-${id}`).click();
    await expect(main).toHaveAttribute("src", /^data:image\//);
    await page.getByTestId("preview-mockup").screenshot({
      path: `test-results/tshirt-mockup-${id}.png`,
    });
  }
});
