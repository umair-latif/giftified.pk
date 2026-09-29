import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test("preview is a gallery of mockups (no flat design): left, right and lifestyle", async ({
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
    ["left", "left"],
    ["right", "right"],
    ["lifestyle", "lifestyle"],
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
