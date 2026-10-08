import { expect, test } from "@playwright/test";

test("a slow page change shows the top progress bar until the page arrives", async ({
  page,
}) => {
  await page.goto("/");
  const bar = page.getByTestId("nav-progress");
  await expect(bar).not.toHaveAttribute("data-active");

  // Make the next page's data slow, like a phone on 4G.
  await page.route(
    (url) =>
      url.pathname.startsWith("/cart") || url.searchParams.has("_rsc"),
    async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    },
  );
  await page.getByRole("link", { name: "Cart" }).first().click();
  await expect(bar).toHaveAttribute("data-active", "true");
  await expect(page).toHaveURL(/\/cart$/, { timeout: 15_000 });
  await expect(bar).not.toHaveAttribute("data-active", { timeout: 5_000 });
});
