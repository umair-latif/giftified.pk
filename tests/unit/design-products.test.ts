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
      imageUrl: (id, n) =>
        `https://giftified.pk/api/templates/${id}/images/${n}`,
      makeId: () => "Abc123xyz",
    });
    expect(warning).toBeUndefined();
    expect(meta.product).toMatchObject({
      slug: "happy-birthday-abc123",
      pricePkr: 1899,
      description: "A cheerful mug.\n\nDishwasher safe.",
    });
    expect(publish).toHaveBeenCalledWith(meta.product!.wooProductId, {
      imageUrls: ["https://giftified.pk/api/templates/Abc123xyz/thumbnail"],
    });
    expect(await getTemplate("Abc123xyz", {}, storage)).not.toBeNull();
  });

  it("keeps an unpublished design as a draft product", async () => {
    const commerce = createMockCommerce();
    const { storage } = createMemoryStorage();
    const publish = vi.spyOn(commerce, "publishDesignProduct");
    await publishTemplateProduct(
      { ...input, published: false },
      {
        commerce,
        storage,
        thumbnailUrl: () => "x",
        imageUrl: () => "x",
        makeId: () => "d1",
      },
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
        imageUrl: () => "x",
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
      imageUrl: () => "x",
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
      imageUrl: () => "x",
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
    await ok.client.publishDesignProduct(777, {
      imageUrls: ["https://x/y.webp"],
    });
    expect(ok.calls.at(-1)!.body).toEqual({
      status: "publish",
      images: [{ src: "https://x/y.webp" }],
    });

    const bad = fakeShop({ imageFails: true });
    await bad.client.publishDesignProduct(777, {
      imageUrls: ["https://x/y.webp"],
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

describe("design product lines", () => {
  it("order body: colour/size/base product go on the line as notes", async () => {
    const { buildOrderBody } = await import("@/lib/commerce/woo-map");
    const body = buildOrderBody(
      {
        checkoutId: "c1",
        customer: {
          fullName: "A B",
          phone: "+923001234567",
          city: "Gujrat",
          addressLine: "House 1, Street 2",
        },
        lines: [],
      },
      [
        {
          wooProductId: 777,
          wooVariationId: 0,
          quantity: 2,
          designId: "d1",
          design: {
            templateId: "t1",
            productId: "mug",
            colourId: "white",
            size: "M",
          },
        },
      ],
      200,
    );
    expect(body.line_items[0]).toEqual({
      product_id: 777,
      quantity: 2,
      meta_data: [
        { key: "_design_id", value: "d1" },
        { key: "_template_id", value: "t1" },
        { key: "_base_product", value: "mug" },
        { key: "Colour", value: "white" },
        { key: "Size", value: "M" },
      ],
    });
  });

  it("mapOrder reads a design line from its notes (the product is not in the base catalog)", async () => {
    const { mapOrder } = await import("@/lib/commerce/woo-map");
    const { wooOrderSchema } = await import("@/lib/commerce/woo-schemas");
    const { wooFixture } = await import("./commerce-woo-helpers");
    const raw = wooFixture<Record<string, unknown>>("order");
    const li = (raw.line_items as Record<string, unknown>[])[0]!;
    raw.line_items = [
      {
        ...li,
        product_id: 777,
        variation_id: 0,
        price: 1899,
        meta_data: [
          { key: "_design_id", value: "d1" },
          { key: "_template_id", value: "t1" },
          { key: "_base_product", value: "mug" },
          { key: "Colour", value: "white" },
        ],
      },
    ];
    const order = mapOrder(wooOrderSchema.parse(raw), []);
    expect(order.lines[0]).toMatchObject({
      productId: "mug",
      colourId: "white",
      templateId: "t1",
      designId: "d1",
      unitPricePkr: 1899,
    });
  });

  it("the Woo adapter prices a design line from its own product and refuses an unpublished one", async () => {
    const { fakeWoo, wooFixture } = await import("./commerce-woo-helpers");
    const woo = fakeWoo();
    const published = {
      id: 777,
      name: "Happy Birthday",
      slug: "hb",
      sku: "design-t1",
      type: "simple",
      status: "publish",
      price: "1899",
      stock_status: "instock",
      description: "<p>Hi</p><script>x</script>",
      meta_data: [{ key: "_base_product", value: "mug" }],
    };
    let designs: unknown[] = [published];
    const fetch: typeof globalThis.fetch = async (u, init) => {
      const url = new URL(String(u));
      if (
        url.pathname.endsWith("/products") &&
        url.searchParams.get("sku") === "design-t1"
      )
        return Response.json(designs, { headers: { "x-wp-totalpages": "1" } });
      return woo.fetch(u, init);
    };
    const client = createWooCommerceClient({
      url: "https://shop.test",
      consumerKey: "k",
      consumerSecret: "s",
      webhookSecret: "w",
      fetch,
    });
    const info = await client.getDesignProduct("t1");
    expect(info).toMatchObject({
      wooProductId: 777,
      pricePkr: 1899,
      baseProductId: "mug",
      descriptionHtml: "<p>Hi</p>",
    });

    const order = {
      checkoutId: "chk-design",
      customer: {
        fullName: "A B",
        phone: "+923001234567" as const,
        city: "Gujrat",
        addressLine: "House 1, Street 2",
      },
      lines: [
        {
          productId: "mug" as const,
          colourId: "white",
          quantity: 1,
          designId: "d1",
          templateId: "t1",
        },
      ],
    };
    await client.createOrder(order).catch(() => undefined);
    const post = woo.calls.find(
      (c) => c.method === "POST" && c.path === "/orders",
    )!;
    const line = (post.body as { line_items: Record<string, unknown>[] })
      .line_items[0]!;
    expect(line.product_id).toBe(777);
    expect(line).not.toHaveProperty("variation_id");
    expect(line).not.toHaveProperty("price"); // never a client/our price: WooCommerce prices it

    designs = []; // unpublished
    await expect(
      client.createOrder({ ...order, checkoutId: "chk-2" }),
    ).rejects.toThrow(/unavailable/);
    expect(wooFixture).toBeDefined();
  });
});

describe("WooCommerce coupons and categories", () => {
  it("findCoupon maps a WooCommerce coupon (case-insensitive code, restrictions, expiry)", async () => {
    const seen: string[] = [];
    const fetch: typeof globalThis.fetch = async (u) => {
      const url = new URL(String(u));
      seen.push(url.pathname + url.search);
      return Response.json(
        [
          {
            id: 1,
            code: "eid15",
            status: "publish",
            discount_type: "percent",
            amount: "15.00",
            date_expires_gmt: "2026-10-31T00:00:00",
            usage_count: 3,
            usage_limit: 100,
            free_shipping: false,
            product_ids: [77],
            excluded_product_ids: [],
            product_categories: [5],
            excluded_product_categories: [],
            minimum_amount: "2000.00",
            maximum_amount: "",
            email_restrictions: [],
          },
        ],
        { headers: { "x-wp-totalpages": "1" } },
      );
    };
    const client = createWooCommerceClient({
      url: "https://shop.test",
      consumerKey: "k",
      consumerSecret: "s",
      webhookSecret: "w",
      fetch,
    });
    expect(await client.findCoupon("  EID15 ")).toEqual({
      code: "eid15",
      kind: "percent",
      amount: 15,
      freeShipping: false,
      expiresAt: "2026-10-31T00:00:00.000Z",
      usageLimit: 100,
      usageCount: 3,
      minSubtotalPkr: 2000,
      productIds: [77],
      excludedProductIds: [],
      categoryIds: [5],
      excludedCategoryIds: [],
      emailRestricted: false,
      published: true,
    });
    expect(seen[0]).toContain("code=eid15");
    expect(await client.findCoupon("other")).toBeNull();
  });

  it("an unknown discount type is treated as no coupon (never guessed)", async () => {
    const { mapCoupon } = await import("@/lib/commerce/woo-map");
    const { wooCouponSchema } = await import("@/lib/commerce/woo-schemas");
    expect(
      mapCoupon(
        wooCouponSchema.parse({
          id: 1,
          code: "x",
          discount_type: "bogo",
          amount: "1",
        }),
      ),
    ).toBeNull();
  });

  it("the order body carries the code, and mapOrder reads the discount back", async () => {
    const { buildOrderBody, mapOrder } = await import("@/lib/commerce/woo-map");
    const { wooOrderSchema } = await import("@/lib/commerce/woo-schemas");
    const { wooFixture } = await import("./commerce-woo-helpers");
    const { mapProduct } = await import("@/lib/commerce/woo-map");
    const { wooProductSchema, wooVariationSchema } =
      await import("@/lib/commerce/woo-schemas");
    const products = wooProductSchema.array().parse(wooFixture("products"));
    const variations = wooVariationSchema
      .array()
      .parse(wooFixture("variations-mug"));
    const body = buildOrderBody(
      {
        checkoutId: "c1",
        couponCode: "eid15",
        customer: {
          fullName: "A B",
          phone: "+923001234567",
          city: "Gujrat",
          addressLine: "House 1, Street 2",
        },
        lines: [],
      },
      [],
      200,
    );
    expect(body.coupon_lines).toEqual([{ code: "eid15" }]);
    const raw = wooFixture<Record<string, unknown>>("order");
    const order = mapOrder(
      wooOrderSchema.parse({ ...raw, discount_total: "285" }),
      [
        mapProduct(
          products.find((p) => p.sku === "mug")!,
          variations,
        )!,
      ],
    );
    expect(order.discountPkr).toBe(285);
  });

  it("design products are filed under found-or-created categories", async () => {
    const calls: { method: string; path: string; body: unknown }[] = [];
    const fetch: typeof globalThis.fetch = async (u, init) => {
      const url = new URL(String(u));
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname.replace("/wp-json/wc/v3", ""),
        body,
      });
      if (url.pathname.endsWith("/products/categories")) {
        if (method === "GET")
          return Response.json(
            url.searchParams.get("slug") === "eid"
              ? [{ id: 5, slug: "eid" }]
              : [],
            { headers: { "x-wp-totalpages": "1" } },
          );
        return Response.json({ id: 9, slug: "ready-made-custom-mug" });
      }
      if (method === "GET")
        return Response.json([], { headers: { "x-wp-totalpages": "1" } });
      return Response.json({
        id: 777,
        name: "n",
        slug: "s",
        sku: "design-t1",
        type: "simple",
        status: "draft",
        price: "1",
        stock_status: "instock",
      });
    };
    const client = createWooCommerceClient({
      url: "https://shop.test",
      consumerKey: "k",
      consumerSecret: "s",
      webhookSecret: "w",
      fetch,
    });
    await client.createDesignProduct({
      templateId: "t1",
      baseProductId: "mug",
      name: "n",
      description: "d",
      pricePkr: 100,
      categories: ["Ready-made Custom Mug", "Eid"],
    });
    expect(
      calls.filter(
        (c) => c.method === "POST" && c.path === "/products/categories",
      ),
    ).toHaveLength(1);
    const product = calls.find(
      (c) => c.method === "POST" && c.path === "/products",
    )!;
    expect((product.body as { categories: unknown }).categories).toEqual([
      { id: 9 },
      { id: 5 },
    ]);
  });
});

describe("product images (mockups)", () => {
  it("stores the images with the template and hands WooCommerce their URLs in order", async () => {
    const commerce = createMockCommerce();
    const { storage } = createMemoryStorage();
    const publish = vi.spyOn(commerce, "publishDesignProduct");
    const { meta } = await publishTemplateProduct(
      {
        ...input,
        images: [
          { label: "Front", bytes: new Uint8Array([1]) },
          { label: "Left", bytes: new Uint8Array([2]) },
        ],
      },
      {
        commerce,
        storage,
        thumbnailUrl: (id) => `https://x/${id}/thumbnail`,
        imageUrl: (id, n) => `https://x/${id}/images/${n}`,
        makeId: () => "img1",
      },
    );
    expect(meta.images).toEqual([{ label: "Front" }, { label: "Left" }]);
    expect(publish).toHaveBeenCalledWith(meta.product!.wooProductId, {
      imageUrls: ["https://x/img1/images/0", "https://x/img1/images/1"],
    });
    expect(await storage.get("templates/img1/images/1.webp")).toEqual(
      new Uint8Array([2]),
    );
  });

  it("image keys are bounded", async () => {
    const { templateImageKey } = await import("@/lib/storage/keys");
    expect(templateImageKey("abc", 0)).toBe("templates/abc/images/0.webp");
    expect(() => templateImageKey("abc", 20)).toThrow();
    expect(() => templateImageKey("../x", 0)).toThrow();
  });
});

describe("design title on lines and the vendor proof", () => {
  it("priceCart returns the design title per line (null for plain products)", async () => {
    const { priceCart } = await import("@/server/checkout/pricing");
    const commerce = createMockCommerce();
    const made = await commerce.createDesignProduct({
      templateId: "t9",
      baseProductId: "mug",
      name: "Happy Birthday",
      description: "Hi",
      pricePkr: 1899,
    });
    await commerce.publishDesignProduct(made.wooProductId, {});
    const r = await priceCart(commerce, {
      lines: [
        { productId: "mug", colourId: "white", quantity: 1 },
        { productId: "mug", colourId: "white", quantity: 1, templateId: "t9" },
      ],
      city: "",
    });
    expect(r.lineTitles).toEqual([null, "Happy Birthday"]);
  });

  it("the proof shows the design title instead of the (duplicate) quantity row", async () => {
    const { buildVendorProof } = await import("@/server/pdf/vendor-proof");
    const { PDFDocument } = await import("pdf-lib");
    const png = new Uint8Array(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      ),
    );
    const make = (designTitle?: string) =>
      buildVendorProof({
        orderId: 1,
        createdAt: "2026-09-30T00:00:00Z",
        productId: "mug",
        productName: "Custom Mug",
        ...(designTitle ? { designTitle } : {}),
        colourName: "White",
        quantity: 1,
        print: {
          widthMm: 228,
          heightMm: 89,
          dpi: 300,
          placement: "x",
          offsetXMm: 0,
          offsetYMm: 0,
        },
        printPng: png,
        customerCity: "Lahore",
      });
    const withTitle = await make("Happy Birthday");
    const without = await make();
    expect((await PDFDocument.load(withTitle)).getPageCount()).toBe(1);
    // Different content → different bytes; both are valid one-page PDFs.
    expect(
      Buffer.compare(Buffer.from(withTitle), Buffer.from(without)),
    ).not.toBe(0);
  });
});
