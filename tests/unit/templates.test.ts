import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { printQualityReport } from "@/lib/print-quality";
import { createMemoryStorage } from "@/lib/storage/memory";
import { createDesignUpload } from "@/server/designs/create-upload";
import {
  TemplateError,
  getTemplate,
  listTemplates,
  saveTemplate,
  templateAssetUrls,
} from "@/server/templates";
import type { DesignDocument } from "@/types/design";

vi.mock("server-only", () => ({}));

const base = JSON.parse(
  readFileSync(new URL("../fixtures/design-mug.json", import.meta.url), "utf8"),
) as DesignDocument;

const photo = {
  type: "Image",
  src: "asset:sample1",
  assetId: "sample1",
  sourceWidthPx: 3000,
  sourceHeightPx: 2000,
  previewWidthPx: 1500,
  previewHeightPx: 1000,
  width: 1500,
  height: 1000,
  scaleX: 127 / 1500,
  scaleY: 127 / 1500,
};

const design = (): DesignDocument => ({
  ...base,
  fabric: {
    ...base.fabric,
    objects: [...(base.fabric.objects as object[]), photo],
  },
});

const sample = {
  assetId: "sample1",
  bytes: new Uint8Array([1, 2, 3]),
  contentType: "image/webp",
};

let n = 0;
const ids = () => `t${++n}`;
const at = (iso: string) => () => new Date(iso);

describe("templates store", () => {
  it("saves a template, marks every photo as a placeholder, and reads it back", async () => {
    const { storage } = createMemoryStorage();
    const meta = await saveTemplate(
      {
        name: "  Eid Mubarak  ",
        productId: "mug",
        occasions: ["eid", "eid", "birthday"],
        published: true,
        design: design(),
        assets: [sample],
        thumbnail: new Uint8Array([9]),
      },
      storage,
      ids,
      at("2026-09-29T10:00:00Z"),
    );
    expect(meta).toMatchObject({
      name: "Eid Mubarak",
      occasions: ["eid", "birthday"],
      published: true,
      hasThumbnail: true,
    });

    const got = await getTemplate(meta.id, {}, storage);
    const images = (got!.design.fabric.objects as { type: string }[]).filter(
      (o) => o.type === "Image",
    ) as unknown as { placeholder?: boolean }[];
    expect(images).toHaveLength(1);
    expect(images[0]!.placeholder).toBe(true);
    expect(got!.assetIds).toEqual(["sample1"]);
    expect(await templateAssetUrls(got!, storage)).toEqual({
      sample1: expect.stringContaining(`templates/${meta.id}/assets/sample1`),
    });
  });

  it("filters by product, occasion and published; newest first", async () => {
    const { storage } = createMemoryStorage();
    const save = (
      name: string,
      published: boolean,
      when: string,
      occ = ["eid"],
    ) =>
      saveTemplate(
        {
          name,
          productId: "mug",
          occasions: occ as never,
          published,
          design: base,
          assets: [],
        },
        storage,
        ids,
        at(when),
      );
    const a = await save("A", true, "2026-01-01T00:00:00Z");
    const b = await save("B", true, "2026-02-01T00:00:00Z", ["birthday"]);
    await save("Draft", false, "2026-03-01T00:00:00Z");

    expect((await listTemplates({}, storage)).map((t) => t.name)).toEqual([
      "B",
      "A",
    ]);
    expect(
      (await listTemplates({ occasion: "birthday" }, storage)).map((t) => t.id),
    ).toEqual([b.id]);
    expect(await listTemplates({ productId: "tshirt" }, storage)).toHaveLength(
      0,
    );
    expect(
      await listTemplates({ includeUnpublished: true }, storage),
    ).toHaveLength(3);
    expect(a.id).not.toBe(b.id);
  });

  it("hides unpublished templates from customers", async () => {
    const { storage } = createMemoryStorage();
    const meta = await saveTemplate(
      {
        name: "Draft",
        productId: "mug",
        occasions: [],
        published: false,
        design: base,
        assets: [],
      },
      storage,
      ids,
    );
    expect(await getTemplate(meta.id, {}, storage)).toBeNull();
    expect(
      await getTemplate(meta.id, { includeUnpublished: true }, storage),
    ).not.toBeNull();
    expect(await getTemplate("nope", {}, storage)).toBeNull();
  });

  it("rejects bad input", async () => {
    const { storage } = createMemoryStorage();
    const input = {
      name: "X",
      productId: "mug" as const,
      occasions: [],
      published: true,
      design: design(),
      assets: [sample],
    };
    await expect(
      saveTemplate({ ...input, name: "  " }, storage, ids),
    ).rejects.toBeInstanceOf(TemplateError);
    await expect(
      saveTemplate({ ...input, assets: [] }, storage, ids),
    ).rejects.toThrow(/don't match/);
    await expect(
      saveTemplate({ ...input, productId: "tshirt" }, storage, ids),
    ).rejects.toThrow(/Invalid design/);
  });
});

describe("placeholders block ordering", () => {
  const withPlaceholder = (): DesignDocument => {
    const d = design();
    const objects = d.fabric.objects as Record<string, unknown>[];
    objects[objects.length - 1] = {
      ...objects[objects.length - 1]!,
      placeholder: true,
    };
    return d;
  };

  it("counts placeholders in the quality report", () => {
    expect(printQualityReport(withPlaceholder().fabric).placeholders).toBe(1);
    expect(printQualityReport(design().fabric).placeholders).toBe(0);
  });

  it("the server refuses to store an order design that still has one", async () => {
    const { storage } = createMemoryStorage();
    await expect(
      createDesignUpload(
        {
          design: withPlaceholder(),
          assets: [
            { assetId: "sample1", contentType: "image/jpeg", size: 1000 },
          ],
        },
        storage,
      ),
    ).rejects.toThrow(/sample photo/);
  });
});
