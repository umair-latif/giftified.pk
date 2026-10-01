import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { printQualityReport } from "@/lib/print-quality";
import { createMemoryStorage } from "@/lib/storage/memory";
import { createDesignUpload } from "@/server/designs/create-upload";
import type { ObjectStorage } from "@/lib/storage";
import {
  TemplateError,
  addSample,
  createTemplateUploads,
  deleteSample,
  getTemplate,
  isTemplateArtwork,
  listSamples,
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

let n = 0;
const ids = () => `t${++n}`;
const at = (iso: string) => () => new Date(iso);

/** The photo as a customer's photo showing library sample `sampleId`. */
const asCustomerPhoto = (
  d: DesignDocument,
  sampleId = "s1",
): DesignDocument => {
  const objects = d.fabric.objects as Record<string, unknown>[];
  objects[objects.length - 1] = {
    ...objects[objects.length - 1]!,
    placeholder: true,
    sampleId,
  };
  return d;
};

async function seedSample(storage: ObjectStorage, id = "s1") {
  return addSample(
    {
      bytes: new Uint8Array([7, 7]),
      contentType: "image/webp",
      widthPx: 800,
      heightPx: 600,
    },
    storage,
    () => id,
  );
}

describe("templates store", () => {
  it("a customer's photo stores a copy of its library sample; nothing is locked", async () => {
    const { storage } = createMemoryStorage();
    await seedSample(storage);
    const d = asCustomerPhoto(design());
    (d.fabric.objects as Record<string, unknown>[]).push({
      type: "Textbox",
      text: "x",
      templateLocked: true,
      customizable: true,
    });
    const meta = await saveTemplate(
      {
        name: "  Eid Mubarak  ",
        productId: "mug",
        occasions: ["eid", "eid", "birthday"],
        published: true,
        design: d,
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
    const list = got!.design.fabric.objects as Record<string, unknown>[];
    const img = list.find((o) => o.type === "Image")!;
    expect(img).toMatchObject({ placeholder: true, sampleId: "s1" });
    expect(img.templateAsset).toBeUndefined();
    expect(list.every((o) => o.templateLocked === undefined)).toBe(true);
    expect(list.every((o) => o.customizable === undefined)).toBe(true);
    expect(got!.placeholderIds).toEqual(["sample1"]);
    expect(await storage.get(`templates/${meta.id}/assets/sample1`)).toEqual(
      new Uint8Array([7, 7]),
    );
    expect(await templateAssetUrls(got!, storage)).toEqual({
      sample1: expect.stringContaining(`templates/${meta.id}/assets/sample1`),
    });
  });

  it("artwork photos print from the original uploaded under the reserved id", async () => {
    const { storage } = createMemoryStorage();
    const ticket = await createTemplateUploads(
      {
        assets: [{ assetId: "sample1", contentType: "image/jpeg", size: 5 }],
      },
      storage,
      () => "art1",
    );
    expect(ticket.templateId).toBe("art1");
    expect(ticket.uploads[0]!.original.url).toContain(
      "templates/art1/assets/sample1",
    );
    expect(ticket.uploads[0]!.preview.url).toContain(
      "templates/art1/previews/sample1",
    );
    const input = {
      id: "art1",
      name: "Lantern",
      productId: "mug" as const,
      occasions: [],
      published: true,
      design: design(),
    };
    // Not uploaded yet: refused.
    await expect(saveTemplate(input, storage)).rejects.toThrow(
      /didn't finish uploading/,
    );
    await storage.put("templates/art1/assets/sample1", new Uint8Array([1]));
    await storage.put("templates/art1/previews/sample1", new Uint8Array([2]));
    const meta = await saveTemplate(input, storage);
    const got = await getTemplate(meta.id, {}, storage);
    const img = (got!.design.fabric.objects as Record<string, unknown>[]).find(
      (o) => o.type === "Image",
    )!;
    expect(img.templateAsset).toBe("art1");
    expect(img.placeholder).toBeUndefined();
    expect(got!.placeholderIds).toEqual([]);
    // The editor gets the preview, never the original.
    expect((await templateAssetUrls(got!, storage)).sample1).toContain(
      "templates/art1/previews/sample1",
    );
    expect(await isTemplateArtwork("art1", "sample1", {}, storage)).toBe(true);

    // A design made from it copies the artwork on the server.
    const copy = await saveTemplate(
      { ...input, id: undefined, name: "Lantern 2", design: got!.design },
      storage,
      () => "art2",
    );
    expect(await storage.get(`templates/${copy.id}/assets/sample1`)).toEqual(
      new Uint8Array([1]),
    );
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
    await seedSample(storage);
    const input = {
      name: "X",
      productId: "mug" as const,
      occasions: [],
      published: true,
      design: asCustomerPhoto(design()),
    };
    await expect(
      saveTemplate({ ...input, name: "  " }, storage, ids),
    ).rejects.toBeInstanceOf(TemplateError);
    await expect(
      saveTemplate({ ...input, productId: "tshirt" }, storage, ids),
    ).rejects.toThrow(/Invalid design/);
    // A customer's photo must show a sample from the library.
    await expect(
      saveTemplate(
        { ...input, design: asCustomerPhoto(design(), "gone") },
        storage,
        ids,
      ),
    ).rejects.toThrow(/no longer in the library/);
    const noSample = design();
    const objs = noSample.fabric.objects as Record<string, unknown>[];
    objs[objs.length - 1] = { ...objs[objs.length - 1]!, placeholder: true };
    await expect(
      saveTemplate({ ...input, design: noSample }, storage, ids),
    ).rejects.toThrow(/needs a sample photo/);
    // Ids are never reused.
    await saveTemplate(input, storage, () => "same");
    await expect(saveTemplate(input, storage, () => "same")).rejects.toThrow(
      /already saved/,
    );
  });

  it("refuses artwork too blurry to print", async () => {
    const { storage } = createMemoryStorage();
    const d = design();
    const objs = d.fabric.objects as Record<string, unknown>[];
    objs[objs.length - 1] = {
      ...objs[objs.length - 1]!,
      sourceWidthPx: 300,
      sourceHeightPx: 200,
    };
    await storage.put("templates/b1/assets/sample1", new Uint8Array([1]));
    await storage.put("templates/b1/previews/sample1", new Uint8Array([1]));
    await expect(
      saveTemplate(
        {
          id: "b1",
          name: "Blurry",
          productId: "mug",
          occasions: [],
          published: true,
          design: d,
        },
        storage,
      ),
    ).rejects.toThrow(/too blurry/);
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

describe("template editors", () => {
  it("matches signed-in emails against TEMPLATE_EDITOR_EMAILS (case-insensitive, trimmed)", async () => {
    const { isTemplateEditorEmail } =
      await import("@/server/templates/editors");
    const env = {
      TEMPLATE_EDITOR_EMAILS: " Founder@Giftified.pk , helper@example.pk ",
    };
    expect(isTemplateEditorEmail("founder@giftified.pk", env)).toBe(true);
    expect(isTemplateEditorEmail("HELPER@example.pk", env)).toBe(true);
    expect(isTemplateEditorEmail("other@example.pk", env)).toBe(false);
    expect(isTemplateEditorEmail("", env)).toBe(false);
    expect(isTemplateEditorEmail("founder@giftified.pk", {})).toBe(false);
  });

  it("records who saved a template", async () => {
    const { storage } = createMemoryStorage();
    const meta = await saveTemplate(
      {
        name: "X",
        productId: "mug",
        occasions: [],
        published: true,
        design: base,
        createdBy: "founder@giftified.pk",
      },
      storage,
      ids,
    );
    expect(meta.createdBy).toBe("founder@giftified.pk");
    expect(
      (await listTemplates({}, storage)).find((t) => t.id === meta.id)
        ?.createdBy,
    ).toBe("founder@giftified.pk");
  });
});

describe("checkout with a design's artwork", () => {
  it("copies the original from the published design instead of asking the phone", async () => {
    const { storage } = createMemoryStorage();
    await storage.put("templates/art1/assets/sample1", new Uint8Array([4, 2]), {
      contentType: "image/jpeg",
    });
    const d = design();
    const objs = d.fabric.objects as Record<string, unknown>[];
    objs[objs.length - 1] = {
      ...objs[objs.length - 1]!,
      templateAsset: "art1",
    };
    const ticket = await createDesignUpload(
      { design: d, assets: [] },
      storage,
      () => "d1",
      async (t, a) => t === "art1" && a === "sample1",
    );
    expect(ticket.uploads).toEqual([]);
    expect(await storage.get("designs/d1/assets/sample1")).toEqual(
      new Uint8Array([4, 2]),
    );
    // The order's design stands on its own: no link back to the published design.
    const stored = JSON.parse(
      new TextDecoder().decode((await storage.get("designs/d1/design.json"))!),
    ) as { fabric: { objects: Record<string, unknown>[] } };
    expect(stored.fabric.objects.some((o) => "templateAsset" in o)).toBe(false);
    // A design that isn't published (any more) can't be ordered.
    await expect(
      createDesignUpload({ design: d, assets: [] }, storage, () => "d2"),
    ).rejects.toThrow(/isn't available/);
  });
});

describe("sample photo library", () => {
  it("adds, lists (newest first) and deletes samples; validates input", async () => {
    const { storage } = createMemoryStorage();
    const one = await addSample(
      {
        bytes: new Uint8Array([1]),
        contentType: "image/webp",
        widthPx: 10,
        heightPx: 10,
      },
      storage,
      () => "a1",
      at("2026-01-01T00:00:00Z"),
    );
    await addSample(
      {
        bytes: new Uint8Array([1]),
        contentType: "image/jpeg",
        widthPx: 10,
        heightPx: 20,
      },
      storage,
      () => "a2",
      at("2026-02-01T00:00:00Z"),
    );
    expect((await listSamples(storage)).map((s) => s.id)).toEqual(["a2", "a1"]);
    expect(one.contentType).toBe("image/webp");
    await expect(
      addSample(
        {
          bytes: new Uint8Array([1]),
          contentType: "image/gif",
          widthPx: 1,
          heightPx: 1,
        },
        storage,
      ),
    ).rejects.toThrow(/JPEG, PNG or WebP/);
    expect(await deleteSample("a1", storage)).toBe(true);
    expect(await deleteSample("a1", storage)).toBe(false);
    expect(await storage.get("samples/a1")).toBeNull();
    expect((await listSamples(storage)).map((s) => s.id)).toEqual(["a2"]);
  });

  it("sample photos are never graded for print quality", () => {
    const d = asCustomerPhoto(design());
    const objs = d.fabric.objects as Record<string, unknown>[];
    objs[objs.length - 1] = { ...objs[objs.length - 1]!, sourceWidthPx: 10 };
    const report = printQualityReport(d.fabric);
    expect(report.placeholders).toBe(1);
    expect(report.status).toBe("ok");
  });
});
