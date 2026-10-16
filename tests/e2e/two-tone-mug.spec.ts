import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** The mug fixture, re-pointed at the Two-Tone Mug (same print area). */
function draft() {
  const doc = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  ) as { productId: string };
  doc.productId = "two-tone-mug";
  return doc;
}

test("two-tone mug preview: right, front and left for the colour picked", async ({
  page,
}) => {
  await page.addInitScript((d) => {
    localStorage.setItem("giftified:draft:two-tone-mug", JSON.stringify(d));
  }, draft());
  await page.goto("/design/two-tone-mug/preview");

  await expect(page.getByTestId("preview-gallery")).toBeVisible();
  const main = page.getByTestId("preview-mockup").getByRole("img");
  await expect(main).toHaveAttribute("src", /^data:image\//);
  let previous = "";
  for (const id of ["right-red", "front-red", "left-red"]) {
    await page.getByTestId(`preview-thumb-${id}`).click();
    await expect(page.getByTestId(`preview-thumb-${id}`)).toHaveAttribute(
      "aria-current",
      "true",
    );
    // Each view is composed fresh: wait for the new photo, not the last one.
    await expect
      .poll(async () => {
        const src = (await main.getAttribute("src")) ?? "";
        return src.startsWith("data:image/") && src !== previous;
      })
      .toBe(true);
    previous = (await main.getAttribute("src")) ?? "";
    // The gallery is one scroll strip holding every view, so shoot the
    // visible image rather than the strip.
    await main.screenshot({ path: `test-results/twotone-${id}.png` });
  }
  // Only the picked colour's photos are offered.
  await expect(page.getByTestId("preview-thumb-left-blue")).toHaveCount(0);
});

test("the editor prints on the white body, not the rim colour", async ({
  page,
}) => {
  await page.goto("/design/two-tone-mug");
  await expect(page.getByTestId("canvas-host")).toBeVisible();
  const bg = await page
    .getByTestId("canvas-host")
    .locator("xpath=..")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(255, 255, 255)");
  await page.getByTestId("editor-main").screenshot({
    path: "test-results/twotone-editor.png",
  });
});
