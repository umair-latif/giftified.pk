import { expect, test } from "@playwright/test";

test("a vendor send link that is forged or expired sends nothing", async ({
  page,
}) => {
  await page.goto("/vendor-send/not-a-real-token");
  await expect(
    page.getByText("This link is invalid or has expired"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Send/ })).toHaveCount(0);
  // Never indexed.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("the contact page shows the hello@ address", async ({ page }) => {
  await page.goto("/contact");
  const link = page.getByRole("link", { name: "hello@designbanana.pk" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "mailto:hello@designbanana.pk");
});
