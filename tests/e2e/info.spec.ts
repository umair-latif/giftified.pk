import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/help", heading: "Help & FAQ", title: "Help & FAQ · Giftified.pk" },
  {
    path: "/contact",
    heading: "Contact us",
    title: "Contact us · Giftified.pk",
  },
  {
    path: "/about",
    heading: "About Giftified.pk",
    title: "About us · Giftified.pk",
  },
  { path: "/privacy", heading: "Privacy", title: "Privacy · Giftified.pk" },
  { path: "/terms", heading: "Terms of sale", title: "Terms · Giftified.pk" },
  {
    path: "/printing-guidelines",
    heading: "Printing guidelines",
    title: "Printing guidelines · Giftified.pk",
  },
] as const;

for (const p of PAGES) {
  test(`${p.path} renders at 360 px with header, footer and a title`, async ({
    page,
  }) => {
    await page.goto(p.path);
    await expect(page).toHaveTitle(p.title);
    await expect(
      page.getByRole("heading", { level: 1, name: p.heading }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Footer" }),
    ).toBeVisible();
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(360);
  });
}

test("footer links reach the info pages", async ({ page }) => {
  await page.goto("/help");
  const footer = page.getByRole("navigation", { name: "Footer" });
  await footer.getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Terms of sale",
  );
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("FAQ questions open and close", async ({ page }) => {
    await page.goto("/help");
    const item = page.locator("details#cod");
    const answer = item.getByText("You pay in cash when the parcel arrives.");
    await expect(item).not.toHaveAttribute("open");
    await expect(answer).toBeHidden();

    await item.locator("summary").tap();
    await expect(item).toHaveAttribute("open", "");
    await expect(answer).toBeVisible();

    await item.locator("summary").tap();
    await expect(item).not.toHaveAttribute("open");
    await expect(answer).toBeHidden();
  });
});
