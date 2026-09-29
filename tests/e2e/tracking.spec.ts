import { expect, test, type Page } from "@playwright/test";
import design from "../fixtures/design-mug.json";

let statusUrl = "";
let orderId = 0;

let pageErrors: string[] = [];
test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
});
test.afterEach(() => expect(pageErrors).toEqual([]));

// These need no order, so they run now.
test("an order link without a valid token is a 404 that points to /track", async ({
  page,
}) => {
  for (const url of [
    "/order/424242",
    "/order/424242?t=",
    "/order/424242?t=AAAAAAAAAAAAAAAAAAAAAA",
    "/order/not-a-number?t=AAAAAAAAAAAAAAAAAAAAAA",
  ]) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(404);
    await expect(
      page.getByRole("heading", { name: "We can’t open this order link" }),
    ).toBeVisible();
  }
  await page
    .getByRole("main")
    .getByRole("link", { name: "Track your order" })
    .tap();
  await expect(page).toHaveURL(/\/track$/);
});

test("/track: an unknown order gets the generic message and keeps the typed values", async ({
  page,
}) => {
  await page.goto("/track");
  await page.getByLabel("Order number").fill("987654321");
  await page.getByLabel("Mobile number").fill("0300 1234567");
  await page.getByRole("button", { name: "Show my order" }).tap();
  await expect(page.getByTestId("track-error")).toHaveText(
    /couldn’t find an order/,
  );
  await expect(page).toHaveURL(/\/track$/);
  await expect(page.getByLabel("Order number")).toHaveValue("987654321");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);
});

// One order is placed first (one mug in the cart → /checkout), then looked
// up in several ways.
test.describe("with a placed order", () => {
  test.describe.configure({ mode: "serial" });

  async function placeOrder(page: Page) {
    await page.addInitScript((json) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("giftified:design:track-design", json);
      localStorage.setItem(
        "giftified:cart",
        JSON.stringify([
          {
            id: "track-line",
            productId: "mug",
            colourId: "white",
            quantity: 1,
            designKey: "track-design",
            addedAt: "2026-09-28T10:00:00.000Z",
          },
        ]),
      );
    }, JSON.stringify(design));
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("Ayesha Khan");
    await page.getByLabel("Mobile number").fill("0300 1234567");
    await page.getByLabel("City").fill("lah");
    await page.getByRole("option", { name: "Lahore" }).tap();
    await page.getByLabel("Address").fill("House 12, Street 4, Model Town");
    await expect(page.getByTestId("total")).toHaveText("Rs 1,699");
    await page.getByRole("button", { name: /Place order/ }).tap();
    await expect(page).toHaveURL(/\/order\/\d+\?t=[\w-]{22}$/);
  }

  test("the confirmation link shows the status without private details", async ({
    page,
  }) => {
    await placeOrder(page);
    const url = new URL(page.url());
    statusUrl = url.pathname + url.search;
    orderId = Number(url.pathname.split("/").pop());

    await expect(
      page.getByRole("heading", { name: "Thank you!" }),
    ).toBeVisible();
    await expect(page.getByTestId("order-number")).toHaveText(`#${orderId}`);
    await expect(page.getByTestId("confirm-message")).toHaveText(
      "We’ll call you on 0300 •••• 567 before printing.",
    );
    const timeline = page.getByTestId("order-timeline");
    await expect(timeline.locator('[aria-current="step"]')).toContainText(
      "Placed",
    );
    for (const step of ["Confirmed", "Shipped", "Delivered"])
      await expect(timeline).toContainText(step);
    await expect(page.getByTestId("order-line")).toContainText("Custom Mug");
    await expect(page.getByTestId("order-line")).toContainText("Gloss White");
    await expect(page.getByText("Delivery to Lahore")).toBeVisible();
    await expect(page.getByTestId("order-total")).toHaveText("Rs 1,699");

    const html = await page.content();
    for (const secret of ["House 12", "Model Town", "Ayesha", "1234567"])
      expect(html).not.toContain(secret);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(360);
  });

  test("the same URL without a valid token is a 404 with a link to /track", async ({
    page,
  }) => {
    const t = new URL(statusUrl, "http://x").searchParams.get("t")!;
    const tampered = `${t.slice(0, -1)}${t.endsWith("A") ? "B" : "A"}`;
    for (const url of [
      `/order/${orderId}`,
      `/order/${orderId}?t=`,
      `/order/${orderId}?t=${tampered}`,
      `/order/${orderId + 1}?t=${t}`,
    ]) {
      const res = await page.goto(url);
      expect(res?.status(), url).toBe(404);
      await expect(
        page.getByRole("heading", { name: "We can’t open this order link" }),
      ).toBeVisible();
      await expect(page.getByTestId("confirm-message")).toHaveCount(0);
    }
    await page
      .getByRole("main")
      .getByRole("link", { name: "Track your order" })
      .tap();
    await expect(page).toHaveURL(/\/track$/);
  });

  test("/track: wrong phone and unknown order get the same message; right phone opens the order", async ({
    page,
  }) => {
    await page.goto("/track");
    const submit = async (orderNumber: string, phone: string) => {
      await page.getByLabel("Order number").fill(orderNumber);
      await page.getByLabel("Mobile number").fill(phone);
      const done = page.waitForResponse(
        (r) => r.url().endsWith("/track") && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Show my order" }).tap();
      await done; // Server Action finished (a failed lookup takes ≥ 1 s)
    };

    await submit(String(orderId), "0300 7654321");
    const error = page.getByTestId("track-error");
    await expect(error).toBeVisible();
    const wrongPhone = await error.textContent();
    // The typed values survive the error.
    await expect(page.getByLabel("Order number")).toHaveValue(String(orderId));

    await submit("987654321", "0300 1234567");
    await expect(error).toHaveText(wrongPhone!);
    expect(wrongPhone).toMatch(/couldn’t find an order/);
    await expect(page).toHaveURL(/\/track$/);

    await submit(`#${orderId}`, "+92 300 1234567");
    await expect(page).toHaveURL(
      new RegExp(`/order/${orderId}\\?t=[\\w-]{22}$`),
    );
    await expect(page.getByTestId("order-number")).toHaveText(`#${orderId}`);
  });

  test("/track lists recent orders opened on this phone", async ({ page }) => {
    await page.goto(statusUrl);
    await expect(page.getByTestId("order-number")).toBeVisible();
    await page.goto("/track");
    const recent = page.getByTestId("recent-orders");
    await expect(recent).toBeVisible();
    await recent.getByRole("link", { name: new RegExp(`#${orderId}`) }).tap();
    await expect(page).toHaveURL(new RegExp(`/order/${orderId}\\?t=`));
    await expect(page.getByTestId("order-number")).toHaveText(`#${orderId}`);
  });
});
