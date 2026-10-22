import { expect, test } from "@playwright/test";

test("home page: hero, products, sections, no horizontal scroll", async ({
  page,
}) => {
  await page.goto("/");
  // Launched: the "not shipped" banner never shows in a production build.
  await expect(page.getByTestId("preview-banner")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Design it yourself. See it before you buy.",
    }),
  ).toBeVisible();
  // The hero carries the heading, the lead and the two actions — nothing else.
  // The promises live in "Why DesignBanana" (checked below), not in a strip.
  await expect(page.getByTestId("hero-trust")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Why DesignBanana" }),
  ).toContainText("Cash on delivery everywhere in Pakistan");
  // The featured occasion tile carries its artwork and no order-by date.
  const occasion = page.getByTestId("featured-occasion");
  await expect(occasion).toHaveAttribute("href", /\/occasions\//);
  await expect(occasion).not.toContainText("Order by");
  await expect(occasion.locator("img")).toHaveAttribute("alt", "");

  // Help block: the WhatsApp button only — the number is not shown while it
  // is a temporary one (founder, 22 Oct 2026).
  const help = page.getByRole("region", { name: "Questions? Ask us" });
  await expect(
    help.getByRole("link", { name: "Chat on WhatsApp" }),
  ).toBeVisible();
  await expect(help.getByTestId("whatsapp-number")).toHaveCount(0);
  await expect(help).not.toContainText("+92 336 9005786");
  await expect(
    page.getByRole("region", { name: "How it works" }),
  ).toContainText("Pay cash when it arrives");
  await expect(page).toHaveTitle("DesignBanana – Kuch khaas banao");
  await expect(page.getByRole("contentinfo")).toContainText("Kuch khaas banao");

  const start = page.getByRole("link", {
    name: "Start designing",
    exact: true,
  });
  await expect(start).toHaveAttribute("href", "/products");

  const mug = page.getByTestId("home-product-mug");
  await expect(mug.getByRole("link")).toHaveAttribute("href", "/products/mug");

  const tshirt = page.getByTestId("home-product-tshirt");
  await expect(tshirt.getByRole("link")).toHaveAttribute(
    "href",
    "/products/tshirt",
  );
  const hoodie = page.getByTestId("home-product-hoodie");
  await expect(hoodie.getByRole("link")).toHaveAttribute(
    "href",
    "/products/hoodie",
  );

  for (const name of [
    "How it works",
    "Make it for any moment",
    "Why DesignBanana",
  ])
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Eid", exact: true }),
  ).toHaveAttribute("href", "/occasions/eid");

  // Scroll to the bottom so lazy images load, then check the width.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);
});

test("Start designing goes to /products", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start designing", exact: true }).tap();
  await expect(page).toHaveURL(/\/products$/);
});

test("how it works: no 3D promise; ready-made designs, easy customising and instant preview", async ({
  page,
}) => {
  await page.goto("/");
  const how = page.getByRole("region", { name: "How it works" });
  await expect(how).toBeVisible();
  await expect(how).not.toContainText("3D");
  await expect(how).toContainText("ready-made design");
  await expect(how).toContainText("Design Studio");
  await expect(how).not.toContainText("everyday scenes");
  // Brand rule: the site works on any device, so no "on your phone" copy.
  await expect(page.getByText(/on your phone/i)).toHaveCount(0);
  // The "New designs" shelf depends on what is published in the store, so it
  // is not asserted here: see the section-order test, which allows for it
  // being absent.
});

test("occasions: one featured tile, the rest as chips", async ({ page }) => {
  await page.goto("/");
  const region = page.getByRole("region", { name: "Make it for any moment" });
  const featured = region.getByTestId("featured-occasion");
  await expect(featured).toHaveAttribute("href", /\/occasions\/[\w-]+$/);
  const chips = region.getByRole("list", { name: "More occasions" });
  await expect(chips.getByRole("link")).toHaveCount(7);
  // Chips are outlined, no shadow at rest.
  const shadow = await chips
    .getByRole("link")
    .first()
    .evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toBe("none");
});

test("the ways in come first, then the blocks that explain", async ({
  page,
}) => {
  await page.goto("/");
  const headings = await page
    .getByRole("heading", { level: 2 })
    .allTextContents();
  const order = (name: string) => headings.findIndex((h) => h.includes(name));
  // Browse by product, then by occasion...
  expect(order("What will you make")).toBeGreaterThanOrEqual(0);
  expect(order("Make it for any moment")).toBeGreaterThan(
    order("What will you make"),
  );
  // ...then the blocks that explain and reassure.
  expect(order("How it works")).toBeGreaterThan(
    order("Make it for any moment"),
  );
  expect(order("Why DesignBanana")).toBeGreaterThan(order("How it works"));
  // The ready-made designs shelf renders only when the store has some; when it
  // does, it is the second way in — between the products and the occasions.
  const designs = order("New designs");
  if (designs >= 0) {
    expect(designs).toBeGreaterThan(order("What will you make"));
    expect(designs).toBeLessThan(order("Make it for any moment"));
  }
});
