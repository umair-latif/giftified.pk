import { expect, test } from "@playwright/test";

test("the web app manifest is served and linked from the page", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({ name: "DesignBanana", display: "standalone" });
  for (const icon of m.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test("the service worker is never cached and the offline page works", async ({
  request,
}) => {
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(sw.headers()["cache-control"]).toContain("no-cache");
  expect(sw.headers()["content-type"]).toContain("javascript");

  const offline = await request.get("/offline");
  expect(offline.ok()).toBe(true);
  expect(await offline.text()).toContain("You're offline");
});

test("with no connection an installed visit shows the offline page", async ({
  page,
  context,
}) => {
  await page.goto("/");
  // Wait for the worker to take control of the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/products").catch(() => {});
  await expect(
    page.getByRole("heading", { name: "You're offline" }),
  ).toBeVisible();
  await context.setOffline(false);
});
