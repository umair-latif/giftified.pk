import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createMockCommerce } from "@/lib/commerce/mock";
import { createMemoryStorage } from "@/lib/storage/memory";
import type { DesignDocument } from "@/types/design";

vi.mock("server-only", () => ({}));
const { createWooCommerceClient } = await import("@/lib/commerce/woocommerce");
const { publishTemplateProduct } = await import("@/server/templates/publish");
const { saveTemplate, listTemplates, getTemplate } =
  await import("@/server/templates/store");
const { filterLiveTemplates } = await import("@/server/templates/live");
const { findOrphanedTemplates, deleteTemplate } =
  await import("@/server/templates/orphans");

const base = JSON.parse(
  readFileSync(new URL("../fixtures/design-mug.json", import.meta.url), "utf8"),
) as DesignDocument;

const input = (name: string, published = true) => ({
  name,
  productId: "mug" as const,
  occasions: [],
  published,
  design: base,
  assets: [],
  thumbnail: new Uint8Array([1]),
  images: [{ label: "Front", bytes: new Uint8Array([2]) }],
  description: "A mug.",
  pricePkr: 1500,
});

async function setup() {
  const commerce = createMockCommerce();
  const { storage } = createMemoryStorage();
  const deps = (id: string) => ({
    commerce,
    storage,
    makeId: () => id,
    thumbnailUrl: () => "x",
    imageUrl: () => "x",
  });
  await publishTemplateProduct(input("Alpha"), deps("alpha1"));
  await publishTemplateProduct(input("Beta"), deps("beta01"));
  // A template that was never a product (older template): must never be hidden.
  await saveTemplate(
    {
      name: "Plain",
      productId: "mug",
      occasions: [],
      published: true,
      design: base,
      assets: [],
    },
    storage,
    () => "plain1",
  );
  return { commerce, storage };
}

describe("designs removed from the store", () => {
  it("hides a template whose product is no longer published; plain templates stay", async () => {
    const { commerce, storage } = await setup();
    const all = await listTemplates({}, storage);
    expect(
      (await filterLiveTemplates(all, commerce)).map((t) => t.id).sort(),
    ).toEqual(["alpha1", "beta01", "plain1"]);

    // The founder deletes / un-publishes "Beta" in WP admin.
    const beta = all.find((t) => t.id === "beta01")!;
    vi.spyOn(commerce, "listDesignProducts").mockImplementation(async (ids) =>
      (
        await Promise.all(
          ids
            .filter((id) => id !== "beta01")
            .map((id) => commerce.getDesignProduct(id)),
        )
      ).flatMap((p) => (p ? [p] : [])),
    );
    const live = await filterLiveTemplates(all, commerce);
    expect(live.map((t) => t.id).sort()).toEqual(["alpha1", "plain1"]);
    expect(beta.product?.slug).toContain("beta");
  });

  it("shows everything when the store can't be reached (an outage must not empty the gallery)", async () => {
    const { commerce, storage } = await setup();
    vi.spyOn(commerce, "listDesignProducts").mockRejectedValue(
      new Error("down"),
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const all = await listTemplates({}, storage);
    expect(await filterLiveTemplates(all, commerce)).toHaveLength(3);
  });

  it("finds orphans and deletes their files and index entry", async () => {
    const { commerce, storage } = await setup();
    expect(await findOrphanedTemplates(commerce, storage)).toEqual([]);
    vi.spyOn(commerce, "listDesignProducts").mockResolvedValue([]);
    const orphans = await findOrphanedTemplates(commerce, storage);
    expect(orphans.map((t) => t.id).sort()).toEqual(["alpha1", "beta01"]); // never "plain1"

    expect(await storage.head("templates/beta01/images/0.webp")).not.toBeNull();
    expect(await deleteTemplate("beta01", storage)).toBeGreaterThan(0);
    expect(await storage.head("templates/beta01/images/0.webp")).toBeNull();
    expect(
      await getTemplate("beta01", { includeUnpublished: true }, storage),
    ).toBeNull();
    expect(
      (await listTemplates({ includeUnpublished: true }, storage))
        .map((t) => t.id)
        .sort(),
    ).toEqual(["alpha1", "plain1"]);
  });
});

describe("WooCommerce listDesignProducts", () => {
  const product = (id: string, status = "publish") => ({
    id: Number(id.replace(/\D/g, "")) + 100,
    name: `Design ${id}`,
    slug: `d-${id}`,
    sku: `design-${id}`,
    type: "simple",
    status,
    price: "1500",
    stock_status: "instock",
    meta_data: [{ key: "_base_product", value: "mug" }],
  });

  it("asks for the SKUs in one call (chunks of 40) and returns only published ones", async () => {
    const urls: string[] = [];
    const fetch: typeof globalThis.fetch = async (u) => {
      const url = new URL(String(u));
      urls.push(url.search);
      const skus = (url.searchParams.get("sku") ?? "").split(",");
      // t2 was deleted; t3 is a draft.
      const rows = skus
        .filter((s) => s !== "design-t2")
        .map((s) =>
          product(
            s.replace("design-", ""),
            s === "design-t3" ? "draft" : "publish",
          ),
        )
        .filter(
          (p) =>
            url.searchParams.get("status") !== "publish" ||
            p.status === "publish",
        );
      return Response.json(rows, { headers: { "x-wp-totalpages": "1" } });
    };
    const client = createWooCommerceClient({
      url: "https://shop.test",
      consumerKey: "k",
      consumerSecret: "s",
      webhookSecret: "w",
      fetch,
    });
    const found = await client.listDesignProducts(["t1", "t2", "t3"]);
    expect(found.map((p) => p.templateId)).toEqual(["t1"]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("sku=design-t1%2Cdesign-t2%2Cdesign-t3");
    expect(urls[0]).toContain("status=publish");

    urls.length = 0;
    const many = Array.from({ length: 85 }, (_, i) => `t${i + 10}`);
    await client.listDesignProducts(many);
    expect(urls).toHaveLength(3); // 40 + 40 + 5
  });
});
