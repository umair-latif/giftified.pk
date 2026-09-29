import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

test("preview shows the design wrapped on the mug, left and right", async ({
  page,
}) => {
  const doc: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures/design-mug.json"), "utf8"),
  );
  await page.addInitScript((d) => {
    localStorage.setItem("giftified:draft:mug", JSON.stringify(d));
  }, doc);
  await page.goto("/design/mug/preview");

  const tabs = page.getByRole("tablist", { name: "Preview view" });
  await expect(tabs).toBeVisible();
  await expect(page.getByTestId("preview-frame")).toBeVisible();

  for (const name of ["Left side", "Right side"]) {
    await tabs.getByRole("tab", { name }).click();
    const mockup = page.getByTestId("preview-mockup");
    await expect(mockup).toBeVisible();
    await expect(page.getByTestId("preview-frame")).toBeHidden();
    await expect(mockup.getByRole("img")).toHaveAttribute(
      "src",
      /^data:image\//,
    );
    await mockup.screenshot({
      path: `test-results/mockup-${name.split(" ")[0]!.toLowerCase()}.png`,
    });
  }

  await tabs.getByRole("tab", { name: "Flat design" }).click();
  await expect(page.getByTestId("preview-frame")).toBeVisible();
});
