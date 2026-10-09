import { expect, test, type Page } from "@playwright/test";

/** Records, for ~1 s, the direction mark and which view-transition animations ran. */
async function watchTransition(page: Page) {
  await page.evaluate(() => {
    const seen = { nav: new Set<string>(), pseudo: new Set<string>() };
    (window as unknown as { __vt: typeof seen }).__vt = seen;
    const end = performance.now() + 1000;
    const tick = () => {
      const nav = document.documentElement.dataset.nav;
      if (nav) seen.nav.add(nav);
      for (const a of document.getAnimations()) {
        const pe = (a.effect as KeyframeEffect | null)?.pseudoElement;
        if (pe?.startsWith("::view-transition"))
          seen.pseudo.add(`${pe} ${(a as CSSAnimation).animationName ?? ""}`);
      }
      if (performance.now() < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function seen(page: Page) {
  await page.waitForTimeout(1100);
  return page.evaluate(() => {
    const s = (
      window as unknown as { __vt: { nav: Set<string>; pseudo: Set<string> } }
    ).__vt;
    return { nav: [...s.nav], pseudo: [...s.pseudo] };
  });
}

test("pages slide forward going deeper, back on the way back; headers stay", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await watchTransition(page);
  await page.getByRole("link", { name: "Start designing" }).tap();
  await expect(page).toHaveURL(/\/products$/);
  const forward = await seen(page);
  expect(forward.nav).toContain("forward");
  expect(forward.pseudo.some((p) => p.includes("page-slide"))).toBe(true);
  // The header has its own group and no animation of its own.
  expect(
    forward.pseudo.some(
      (p) => p.includes("(site-header)") && p.includes("page-"),
    ),
  ).toBe(false);

  // Back inside the shop (the logo, a back arrow) slides the other way. The
  // phone's own back button isn't animated by us: phone browsers animate
  // their back gesture themselves, and a second slide would feel doubled.
  await watchTransition(page);
  await page.getByRole("link", { name: "DesignBanana home" }).tap();
  await expect(page).toHaveURL(/\/$/);
  const back = await seen(page);
  expect(back.nav).toContain("back");
  expect(back.pseudo.some((p) => p.includes("page-slide"))).toBe(true);
});

test.describe("reduce motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("pages swap without any slide", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await watchTransition(page);
    await page.getByRole("link", { name: "Start designing" }).tap();
    await expect(page).toHaveURL(/\/products$/);
    const s = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) =>
          (a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
            "::view-transition",
          ),
        )
        .map((a) => a.effect?.getComputedTiming().duration),
    );
    for (const d of s) expect(d).toBe(0);
  });
});
