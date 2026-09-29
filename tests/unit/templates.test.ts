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
        assets: [],
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

describe("template layer roles", () => {
  it("locks every layer except customizable ones and sample photos", async () => {
    const { lockLayersForCustomer } =
      await import("@/features/templates/lock-layers");
    const out = lockLayersForCustomer({
      version: "7",
      objects: [
        { type: "Textbox", text: "Happy Birthday" },
        { type: "Textbox", text: "Name", customizable: true },
        { type: "Image", placeholder: true },
        { type: "Rect", templateLocked: true, customizable: true },
      ],
    });
    const flags = (out.objects as { templateLocked?: boolean }[]).map(
      (o) => o.templateLocked,
    );
    expect(flags).toEqual([true, undefined, undefined, undefined]);
    expect(out.version).toBe("7");
  });

  it("saving forces photos to be customizable placeholders and drops customer lock stamps", async () => {
    const { storage } = createMemoryStorage();
    const d = design();
    const objects = d.fabric.objects as Record<string, unknown>[];
    objects.push({ type: "Textbox", text: "x", templateLocked: true });
    const meta = await saveTemplate(
      {
        name: "Roles",
        productId: "mug",
        occasions: [],
        published: true,
        design: d,
        assets: [sample],
      },
      storage,
      ids,
    );
    const saved = await getTemplate(meta.id, {}, storage);
    const list = saved!.design.fabric.objects as Record<string, unknown>[];
    const img = list.find((o) => o.type === "Image")!;
    expect(img.customizable).toBe(true);
    expect(img.placeholder).toBe(true);
    expect(list.every((o) => o.templateLocked === undefined)).toBe(true);
  });
});
