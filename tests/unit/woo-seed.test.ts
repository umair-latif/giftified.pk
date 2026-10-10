import { describe, expect, it } from "vitest";
import {
  colourHexesFromTerms,
  mapProduct,
  quoteFromZones,
} from "@/lib/commerce/woo-map";
import {
  wooAttributeTermSchema,
  wooProductSchema,
  wooVariationSchema,
} from "@/lib/commerce/woo-schemas";
import {
  HOODIE,
  MUG,
  TSHIRT,
  COD_TEXTS,
  ZONES,
  seedWooCommerce,
} from "../../scripts/woo-seed-lib";

/** Tiny in-memory WooCommerce: just the endpoints the seed script uses. */
function fakeWoo() {
  let nextId = 100;
  const settings: Record<string, string> = {};
  let codEnabled = false;
  let cod: Record<string, unknown> = {};
  const products: Record<string, unknown>[] = [];
  const variations = new Map<number, Record<string, unknown>[]>();
  const zones: { id: number; name: string; order: number }[] = [
    { id: 0, name: "Locations not covered", order: 0 },
  ];
  const methods = new Map<number, Record<string, unknown>[]>();
  const webhooks: Record<string, unknown>[] = [];
  const attributes: { id: number; name: string; slug: string }[] = [];
  const terms = new Map<
    number,
    { id: number; name: string; description: string }[]
  >();
  const writes: string[] = [];

  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/wp-json\/wc\/v3/, "");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (method !== "GET") writes.push(`${method} ${path}`);
    const ok = (json: unknown) =>
      new Response(JSON.stringify(json), { status: 200 });
    let m: RegExpMatchArray | null;

    if ((m = path.match(/^\/settings\/general\/(.+)$/))) {
      settings[m[1]!] = body.value;
      return ok({});
    }
    if (path === "/payment_gateways/cod") {
      codEnabled = body.enabled;
      cod = body;
      return ok({});
    }
    if (path === "/products" && method === "GET")
      return ok(products.filter((p) => p.sku === url.searchParams.get("sku")));
    if (path === "/products" && method === "POST") {
      const p = { id: nextId++, price: "", stock_status: "instock", ...body };
      products.push(p);
      variations.set(p.id as number, []);
      return ok(p);
    }
    if ((m = path.match(/^\/products\/(\d+)\/variations$/))) {
      const list = variations.get(Number(m[1]))!;
      if (method === "GET") return ok(list);
      const v = {
        id: nextId++,
        price: body.regular_price,
        stock_status: "instock",
        ...body,
      };
      list.push(v);
      return ok(v);
    }
    if (path === "/shipping/zones" && method === "GET") return ok(zones);
    if (path === "/shipping/zones" && method === "POST") {
      const z = { id: nextId++, name: body.name, order: zones.length };
      zones.push(z);
      methods.set(z.id, []);
      return ok(z);
    }
    if (path.match(/^\/shipping\/zones\/\d+\/locations$/)) return ok(body);
    if ((m = path.match(/^\/shipping\/zones\/(\d+)\/methods$/))) {
      const list = methods.get(Number(m[1])) ?? [];
      if (method === "GET") return ok(list);
      const inst = {
        instance_id: nextId++,
        method_id: body.method_id,
        enabled: true,
        order: 0,
        settings: {},
      };
      list.push(inst);
      methods.set(Number(m[1]), list);
      return ok(inst);
    }
    if ((m = path.match(/^\/shipping\/zones\/(\d+)\/methods\/(\d+)$/))) {
      const inst = methods
        .get(Number(m[1]))!
        .find((x) => x.instance_id === Number(m![2]))!;
      inst.settings = Object.fromEntries(
        Object.entries(body.settings as Record<string, string>).map(
          ([k, v]) => [k, { value: v }],
        ),
      );
      return ok(inst);
    }
    if (path === "/products/attributes") {
      if (method === "GET") return ok(attributes);
      const a = { id: nextId++, name: body.name, slug: `pa_${body.slug}` };
      attributes.push(a);
      terms.set(a.id, []);
      return ok(a);
    }
    if ((m = path.match(/^\/products\/attributes\/(\d+)\/terms$/))) {
      const list = terms.get(Number(m[1]))!;
      if (method === "GET") return ok(list);
      const t = {
        id: nextId++,
        name: body.name,
        description: body.description,
      };
      list.push(t);
      return ok(t);
    }
    if (path === "/webhooks") {
      if (method === "GET") return ok(webhooks);
      webhooks.push(body);
      return ok(body);
    }
    return new Response(`no route ${method} ${path}`, { status: 404 });
  }) as typeof globalThis.fetch;

  return {
    fetch,
    settings,
    products,
    variations,
    zones,
    methods,
    webhooks,
    attributes,
    terms,
    writes,
    cod: () => codEnabled,
    codBody: () => cod,
  };
}

const base = {
  url: "https://shop.test",
  consumerKey: "ck",
  consumerSecret: "cs",
  log: () => {},
};

describe("woo:seed", () => {
  it("sets up PKR, COD, the mug and city shipping zones the app can read", async () => {
    const wc = fakeWoo();
    await seedWooCommerce({ ...base, fetch: wc.fetch });

    expect(wc.settings.woocommerce_currency).toBe("PKR");
    // Pakistan has provinces in WooCommerce: "PK" alone is rejected.
    expect(wc.settings.woocommerce_default_country).toBe("PK:PB");
    expect(wc.cod()).toBe(true);
    // English COD texts, so a German WordPress doesn't put its translated
    // defaults ("Bezahle bei Lieferung in bar") in the order emails.
    expect(wc.codBody()).toMatchObject({
      title: "Cash on Delivery",
      description: COD_TEXTS.description,
      settings: { instructions: COD_TEXTS.instructions },
    });

    // The adapter maps the seeded product to our mug with a white variant.
    const product = wooProductSchema.parse(wc.products[0]);
    const vars = wc.variations
      .get(product.id)!
      .map((v) => wooVariationSchema.parse(v));
    const mapped = mapProduct(product, vars);
    expect(mapped?.productId).toBe("mug");
    expect(mapped?.variants).toEqual([
      expect.objectContaining({
        colourId: "white",
        pricePkr: MUG.pricePkr,
        inStock: true,
      }),
    ]);

    // The swatch comes from the global Colour attribute's term description.
    const colourTerms = wooAttributeTermSchema
      .array()
      .parse(wc.terms.get(wc.attributes[0]!.id));
    expect(
      mapProduct(product, vars, colourHexesFromTerms(colourTerms))?.variants[0],
    ).toMatchObject({ colourName: "White", colourHex: "#ffffff" });

    // Shipping quotes work by city name, with a fallback for everywhere else.
    const withRates = wc.zones.map((zone) => ({
      zone,
      methods: (wc.methods.get(zone.id) ?? []) as never[],
    }));
    expect(quoteFromZones("Sialkot", withRates)).toBe(150);
    expect(quoteFromZones("Rawalpindi", withRates)).toBe(250);
    expect(quoteFromZones("Multan", withRates)).toBe(300);
    expect(wc.zones).toHaveLength(ZONES.length + 1);
  });

  it("keeps going when a store setting is rejected, and says how to set it by hand", async () => {
    const wc = fakeWoo();
    const lines: string[] = [];
    const fetch = (async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).includes("woocommerce_default_country")
        ? new Response(JSON.stringify({ code: "rest_setting_value_invalid" }), {
            status: 400,
          })
        : wc.fetch(input, init)) as typeof globalThis.fetch;
    await seedWooCommerce({ ...base, fetch, log: (l) => lines.push(l) });

    expect(lines.join("\n")).toMatch(/Set it by hand: .*Pakistan — Punjab/);
    expect(wc.settings.woocommerce_currency).toBe("PKR");
    expect(wc.cod()).toBe(true);
    expect(wc.products.length).toBeGreaterThan(0);
  });

  it("seeds the T-shirt as Colour x Size variations the app maps to variants", async () => {
    const wc = fakeWoo();
    await seedWooCommerce({ ...base, fetch: wc.fetch });
    const product = wooProductSchema.parse(
      wc.products.find((p) => p.sku === "tshirt"),
    );
    const vars = wc.variations
      .get(product.id)!
      .map((v) => wooVariationSchema.parse(v));
    const mapped = mapProduct(product, vars);
    expect(mapped?.productId).toBe("tshirt");
    expect(mapped?.variants).toHaveLength(10);
    const black = mapped!.variants.filter((v) => v.colourId === "black");
    expect(black.map((v) => v.size)).toEqual(TSHIRT.sizes);
    expect(black.every((v) => v.pricePkr === TSHIRT.pricePkr)).toBe(true);
  });

  it("seeds the hoodie as a draft in White and Heather Grey", async () => {
    const wc = fakeWoo();
    await seedWooCommerce({ ...base, fetch: wc.fetch });
    const raw = wc.products.find((p) => p.sku === "hoodie")!;
    expect(raw.status).toBe("draft");
    // Mapped as it will be once the founder publishes it (drafts stay hidden).
    const product = wooProductSchema.parse({ ...raw, status: "publish" });
    const vars = wc.variations
      .get(product.id)!
      .map((v) => wooVariationSchema.parse(v));
    const mapped = mapProduct(product, vars);
    expect(mapped?.productId).toBe("hoodie");
    expect(new Set(mapped!.variants.map((v) => v.colourId))).toEqual(
      new Set(["white", "grey"]),
    );
    expect(mapped!.variants).toHaveLength(
      HOODIE.colours.length * HOODIE.sizes.length,
    );
  });

  it("is safe to run twice: the second run creates nothing new", async () => {
    const wc = fakeWoo();
    await seedWooCommerce({ ...base, fetch: wc.fetch });
    const before = wc.writes.filter((w) => w.startsWith("POST")).length;
    await seedWooCommerce({ ...base, fetch: wc.fetch });
    const after = wc.writes.filter((w) => w.startsWith("POST")).length;
    expect(after).toBe(before);
    expect(wc.products).toHaveLength(3);
    expect(wc.variations.get(wc.products[1]!.id as number)).toHaveLength(
      TSHIRT.colours.length * TSHIRT.sizes.length,
    );
  });

  it("registers both order webhooks once when given the app URL", async () => {
    const wc = fakeWoo();
    const opts = {
      ...base,
      fetch: wc.fetch,
      webhookUrl: "https://app.test/api/webhooks/commerce",
      webhookSecret: "s",
    };
    await seedWooCommerce(opts);
    await seedWooCommerce(opts);
    expect(wc.webhooks.map((w) => w.topic)).toEqual([
      "order.created",
      "order.updated",
    ]);
  });
});
