import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  colourHexesFromTerms,
  htmlToText,
  mapProduct,
  parseHex,
  sanitizeHtml,
} from "@/lib/commerce/woo-map";
import {
  wooAttributeTermSchema,
  wooProductSchema,
  wooVariationSchema,
} from "@/lib/commerce/woo-schemas";

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/woo/${name}.json`, import.meta.url),
      "utf8",
    ),
  );

const [rawMug] = fixture("products") as Record<string, unknown>[];
const variations = wooVariationSchema.array().parse(fixture("variations-mug"));

// The recorded mug, as WooCommerce returns it once the founder has added
// photos and descriptions in WP admin.
const mug = wooProductSchema.parse({
  ...rawMug,
  images: [
    {
      id: 7,
      src: "https://shop.test/wp-content/uploads/mug-front.webp",
      alt: "",
    },
    {
      id: 8,
      src: "https://shop.test/wp-content/uploads/mug-side.webp",
      alt: "Side view",
    },
  ],
  short_description:
    "<p>Our classic 11oz mug &#8211; printed all the way round.</p>\n",
  description:
    '<h3>Features</h3><ul><li><b>Dishwasher</b> safe</li><li>11oz</li></ul><p style="color:red" onclick="x()">Printed in <a href="https://evil.test">Gujrat</a>.</p><script>alert(1)</script>',
});

const colourTerms = wooAttributeTermSchema.array().parse([
  { id: 21, name: "Gloss White", slug: "gloss-white", description: "#FFFFFF" },
  { id: 22, name: "Black", slug: "black", description: "<p>#111</p>\n" },
  { id: 23, name: "Red", slug: "red", description: "Bright red" },
]);

describe("catalog mapping from WooCommerce", () => {
  it("maps images (alt falls back to the product name), slug and descriptions", () => {
    const p = mapProduct(mug, variations)!;
    expect(p.slug).toBe("custom-mug");
    expect(p.images).toEqual([
      {
        src: "https://shop.test/wp-content/uploads/mug-front.webp",
        alt: "Custom Mug",
      },
      {
        src: "https://shop.test/wp-content/uploads/mug-side.webp",
        alt: "Side view",
      },
    ]);
    expect(p.shortDescription).toBe(
      "Our classic 11oz mug – printed all the way round.",
    );
    expect(p.descriptionHtml).toBe(
      "<p>Features</p><ul><li><strong>Dishwasher</strong> safe</li><li>11oz</li></ul><p>Printed in Gujrat.</p>",
    );
  });

  it("takes colour names from WooCommerce and hexes from the global attribute terms", () => {
    const p = mapProduct(mug, variations, colourHexesFromTerms(colourTerms))!;
    expect(
      p.variants.map((v) => [v.colourId, v.colourName, v.colourHex]),
    ).toEqual([
      ["white", "Gloss White", "#ffffff"],
      ["black", "Black", "#111111"],
    ]);
  });

  it("falls back to src/config/products colours when WooCommerce has no hex", () => {
    const p = mapProduct(mug, variations)!;
    // White is in the mug config (#ffffff); black isn't, so it has a name but no swatch.
    expect(p.variants[0]).toMatchObject({
      colourName: "Gloss White",
      colourHex: "#ffffff",
    });
    expect(p.variants[1]).toMatchObject({ colourName: "Black" });
    expect(p.variants[1]).not.toHaveProperty("colourHex");
  });

  it("leaves optional fields out when WooCommerce has none", () => {
    const p = mapProduct(wooProductSchema.parse(rawMug), variations)!;
    expect(p).not.toHaveProperty("shortDescription");
    expect(p).not.toHaveProperty("descriptionHtml");
  });

  it("shortens long descriptions for cards and meta tags", () => {
    const long = wooProductSchema.parse({
      ...rawMug,
      description: `<p>${"A lovely gift mug for every occasion. ".repeat(10)}</p>`,
    });
    const s = mapProduct(long, variations)!.shortDescription!;
    expect(s.length).toBeLessThanOrEqual(180);
    expect(s.endsWith("…")).toBe(true);
  });

  it("parses swatch hexes from term descriptions", () => {
    expect(parseHex("#FFFFFF")).toBe("#ffffff");
    expect(parseHex("fff")).toBe("#ffffff");
    expect(parseHex("<p>#1a2B3c</p>")).toBe("#1a2b3c");
    expect(parseHex("Bright red")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
    expect(colourHexesFromTerms(colourTerms).has("red")).toBe(false);
  });
});

describe("sanitizeHtml (product descriptions)", () => {
  it("keeps only p, ul, li, strong, em, br — never attributes", () => {
    expect(
      sanitizeHtml(
        '<p class="x" style="a:b"><em>Hi</em><br/><i>there</i> <b>you</b></p>',
      ),
    ).toBe("<p><em>Hi</em><br><em>there</em> <strong>you</strong></p>");
  });

  it("drops scripts, styles, iframes and their content", () => {
    const out = sanitizeHtml(
      '<p>ok</p><script>steal()</script><style>p{}</style><iframe src="x">y</iframe><svg onload="z"><text>t</text></svg>',
    );
    expect(out).toBe("<p>ok</p>");
  });

  it("removes links and event handlers but keeps their text", () => {
    const out = sanitizeHtml(
      '<a href="javascript:alert(1)" onmouseover="x">click</a><img src=x onerror=alert(1)>',
    );
    expect(out).toBe("click");
    expect(out).not.toMatch(/on\w+=|javascript:|<a|<img/i);
  });

  it("escapes stray angle brackets so nothing can open a tag", () => {
    expect(
      sanitizeHtml("5 < 6 and <scr<script>ipt>alert(1)</script>"),
    ).not.toMatch(/<script/i);
    expect(sanitizeHtml("a <b")).toBe("a &lt;b");
    expect(sanitizeHtml("<p>x</p><!-- <script>bad</script> -->")).toBe(
      "<p>x</p>",
    );
  });

  it("drops empty paragraphs and tidies whitespace", () => {
    expect(sanitizeHtml("<p> </p>\n<p>\n Hello\n world </p>")).toBe(
      "<p>Hello world</p>",
    );
  });

  it("htmlToText decodes entities and strips tags", () => {
    expect(htmlToText("<p>Tom&#8217;s &amp; Jerry&rsquo;s&nbsp;mug</p>")).toBe(
      "Tom’s & Jerry’s mug",
    );
  });
});
