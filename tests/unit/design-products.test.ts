import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { descriptionHtml } from "@/lib/commerce/woo-map";
import { createMockCommerce } from "@/lib/commerce/mock";
import { createMemoryStorage } from "@/lib/storage/memory";
import type { DesignDocument } from "@/types/design";

vi.mock("server-only", () => ({}));
const { createWooCommerceClient, WooCommerceError } =
  await import("@/lib/commerce/woocommerce");
const { publishTemplateProduct, slugify } =
  await import("@/server/templates/publish");
const { getTemplate } = await import("@/server/templates/store");

const base = JSON.parse(
  readFileSync(new URL("../fixtures/design-mug.json", import.meta.url), "utf8"),
) as DesignDocument;

const input = {
  name: "Happy Birthday!",
  productId: "mug" as const,
  occasions: ["birthday" as const],
  published: true,
  design: base,
  assets: [],
  thumbnail: new Uint8Array([1]),
  description: "A cheerful mug.\n\nDishwasher safe.",
  pricePkr: 1899,
};

describe("publishing a design as a product", () => {
  it("creates the draft product, saves the template with the link, then publishes", async () => {
    const commerce = createMockCommerce();
    const { storage } = createMemoryStorage();
    const publish = vi.spyOn(commerce, "publishDesignProduct");
    const { meta, warning } = await publishTemplateProduct(input, {
      commerce,
      storage,
      thumbnailUrl: (id) =>
        `https://giftified.pk/api/templates/${id}/thumbnail`,
      makeId: () => "Abc123xyz",
    });
    expect(warning).toBeUndefined();
    expect(meta.product).toMatchObject({
      slug: "happy-birthday-abc123",
      pricePkr: 1899,
      description: "A cheerful mug.\n\nDishwasher safe.",
    });
    expect(publish).toHaveBeenCalledWith(meta.product!.wooProductId, {
      imageUrl: "https://giftified.pk/api/templates/Abc123xyz/thumbnail",
    });
    expect(await getTemplate("Abc123xyz", {}, storage)).not.toBeNull();
  });

  it("keeps an unpublished design as a draft product", async () => {
    const commerce = createMockCommerce();
    const { storage } = createMemoryStorage();
    const publish = vi.spyOn(commerce, "publishDesignProduct");
    await publishTemplateProduct(
      { ...input, published: false },
      { commerce, storage, thumbnailUrl: () => "x", makeId: () => "d1" },
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("saves nothing when the shop can't create the product", async () => {
    const commerce = createMockCommerce();
    const { storage } = createMemoryStorage();
    vi.spyOn(commerce, "createDesignProduct").mockRejectedValue(
      new WooCommerceError("down", 503),
    );
    await expect(
      publishTemplateProduct(input, {
        commerce,
        storage,
        thumbnailUrl: () => "x",
        makeId: () => "d2",
      }),
    ).rejects.toBeInstanceOf(WooCommerceError);
    expect(
      await getTemplate("d2", { includeUnpublished: true }, storage),
    ).toBeNull();
  });

  it("warns (template saved) when publishing the product fails", async () => {
    const commerce = createMockCommerce();
    const { storage } = createMemoryStorage();
    vi.spyOn(commerce, "publishDesignProduct").mockRejectedValue(
      new Error("x"),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await publishTemplateProduct(input, {
      commerce,
      storage,
      thumbnailUrl: () => "x",
      makeId: () => "d3",
    });
    expect(r.warning).toMatch(/still a draft/);
    expect(await getTemplate("d3", {}, storage)).not.toBeNull();
  });

  it("validates price and description", async () => {
    const deps = {
      commerce: createMockCommerce(),
      storage: createMemoryStorage().storage,
      thumbnailUrl: () => "x",
    };
    for (const bad of [0, -5, 12.5, 2_000_000])
      await expect(
        publishTemplateProduct({ ...input, pricePkr: bad }, deps),
      ).rejects.toThrow(/whole rupees/);
    await expect(
      publishTemplateProduct({ ...input, description: "  " }, deps),
    ).rejects.toThrow(/description/);
  });

  it("slugify makes URL-safe words", () => {
    expect(slugify("Happy Birthday!")).toBe("happy-birthday");
    expect(slugify("  عید مبارک  ")).toBe("design");
    expect(slugify("A".repeat(80)).length).toBeLessThanOrEqual(40);
  });

  it("descriptions become escaped paragraphs", () => {
    expect(descriptionHtml("One <b>\nline\n\nTwo & three")).toBe(
      "<p>One &lt;b&gt;<br>line</p><p>Two &amp; three</p>",
    );
  });
});

describe("WooCommerce design products", () => {
  function fakeShop(opts: { imageFails?: boolean; existing?: unknown } = {}) {
    const calls: {
      method: string;
      path: string;
      body: unknown;
      query: string;
    }[] = [];
    const fetch = async (u: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(u));
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname.replace("/wp-json/wc/v3", ""),
        body,
        query: url.search,
      });
      if (method === "GET")
        return Response.json(opts.existing ? [opts.existing] : [], {
          headers: { "x-wp-totalpages": "1" },
        });
      if (
        method === "PUT" &&
        opts.imageFails &&
        (body as { images?: unknown }).images
      )
        return Response.json(
          { code: "woocommerce_product_image_upload_error", message: "no" },
          { status: 400 },
        );
      return Response.json({
        id: 777,
        name: "n",
        slug: "n-slug",
        sku: "design-t1",
        type: "simple",
        status: "draft",
        price: "1899",
        stock_status: "instock",
      });
    };
    const client = createWooCommerceClient({
      url: "https://shop.test",
      consumerKey: "k",
      consumerSecret: "s",
      webhookSecret: "w",
      fetch: fetch as typeof globalThis.fetch,
    });
    return { client, calls };
  }
  const newProduct = {
    templateId: "t1",
    baseProductId: "mug" as const,
    name: "Happy Birthday",
    description: "Hi\n\nThere",
    pricePkr: 1899,
  };

  it("creates a hidden draft SIMPLE product with our SKU and link meta", async () => {
    const { client, calls } = fakeShop();
    expect(await client.createDesignProduct(newProduct)).toEqual({
      wooProductId: 777,
      slug: "n-slug",
    });
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.path).toBe("/products");
    expect(post.body).toMatchObject({
      type: "simple",
      status: "draft",
      sku: "design-t1",
      regular_price: "1899",
      catalog_visibility: "hidden",
      manage_stock: false,
      description: "<p>Hi</p><p>There</p>",
      meta_data: [
        { key: "_template_id", value: "t1" },
        { key: "_base_product", value: "mug" },
      ],
    });
  });

  it("is idempotent: an existing product with the SKU is reused", async () => {
    const { client, calls } = fakeShop({
      existing: {
        id: 42,
        name: "x",
        slug: "x-slug",
        sku: "design-t1",
        type: "simple",
        status: "draft",
        price: "1",
        stock_status: "instock",
      },
    });
    expect(await client.createDesignProduct(newProduct)).toEqual({
      wooProductId: 42,
      slug: "x-slug",
    });
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("publishes with the image, and without it when WooCommerce can't fetch it", async () => {
    const ok = fakeShop();
    await ok.client.publishDesignProduct(777, { imageUrl: "https://x/y.webp" });
    expect(ok.calls.at(-1)!.body).toEqual({
      status: "publish",
      images: [{ src: "https://x/y.webp" }],
    });

    const bad = fakeShop({ imageFails: true });
    await bad.client.publishDesignProduct(777, {
      imageUrl: "https://x/y.webp",
    });
    const puts = bad.calls.filter((c) => c.method === "PUT");
    expect(puts).toHaveLength(2);
    expect(puts[1]!.body).toEqual({ status: "publish" });
  });

  it("keeps design products off the base catalog (listing filters by base SKUs)", async () => {
    const { client, calls } = fakeShop();
    await client.listProducts();
    expect(calls[0]!.query).toContain("sku=mug");
    expect(calls[0]!.query).not.toContain("design-");
  });
});
