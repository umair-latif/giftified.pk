import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/lib/storage/memory";
import {
  DesignUploadError,
  createDesignUpload,
} from "@/server/designs/create-upload";
import {
  DesignUploadFailed,
  uploadDesignForOrder,
} from "@/features/editor/upload-design";
import type { DesignDocument } from "@/types/design";

vi.mock("server-only", () => ({}));

const textOnly = JSON.parse(
  readFileSync(new URL("../fixtures/design-mug.json", import.meta.url), "utf8"),
) as DesignDocument;

function withPhoto(dpiOk = true): DesignDocument {
  // 3000 px original; printed 127 mm (300 DPI) or 508 mm (150 → still "warn"), or 1000 mm (block)
  const widthMm = dpiOk ? 127 : 1000;
  return {
    ...textOnly,
    fabric: {
      ...textOnly.fabric,
      objects: [
        ...(textOnly.fabric.objects as object[]),
        {
          type: "Image",
          src: "asset:photo1",
          assetId: "photo1",
          sourceWidthPx: 3000,
          sourceHeightPx: 2000,
          previewWidthPx: 1500,
          previewHeightPx: 1000,
          width: 1500,
          height: 1000,
          scaleX: widthMm / 1500,
          scaleY: widthMm / 1500,
        },
      ],
    },
  };
}

const photoAsset = {
  assetId: "photo1",
  contentType: "image/jpeg",
  size: 2_000_000,
};

describe("POST /api/designs logic", () => {
  it("stores the design and returns a direct-upload URL per photo", async () => {
    const { storage, objects } = createMemoryStorage();
    const ticket = await createDesignUpload(
      { design: withPhoto(), assets: [photoAsset] },
      storage,
      () => "dsg1",
    );
    expect(ticket).toEqual({
      designId: "dsg1",
      uploads: [
        {
          assetId: "photo1",
          contentType: "image/jpeg",
          url: "/api/dev-storage/designs/dsg1/assets/photo1",
        },
      ],
    });
    expect(objects.has("designs/dsg1/design.json")).toBe(true);
  });

  it("uses the server's print size, not the one sent by the phone", async () => {
    const { storage, objects } = createMemoryStorage();
    const tampered = {
      ...textOnly,
      printArea: { widthMm: 999, heightMm: 999, safeMarginMm: 0 },
    };
    await createDesignUpload(
      { design: tampered, assets: [] },
      storage,
      () => "dsg2",
    );
    const saved = JSON.parse(
      new TextDecoder().decode(objects.get("designs/dsg2/design.json")!.body),
    );
    expect(saved.printArea.widthMm).not.toBe(999);
  });

  it("rejects mismatched photo lists, bad input, huge files and blurry photos", async () => {
    const { storage } = createMemoryStorage();
    const expectErr = (body: unknown, status: number, msg?: RegExp) =>
      expect(createDesignUpload(body, storage)).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof DesignUploadError &&
          e.status === status &&
          (!msg || msg.test(e.message)),
      );
    await expectErr({ design: withPhoto(), assets: [] }, 422, /don't match/);
    await expectErr(
      { design: textOnly, assets: [photoAsset] },
      422,
      /don't match/,
    );
    await expectErr({ design: { nope: true }, assets: [] }, 400);
    await expectErr(
      { design: withPhoto(), assets: [{ ...photoAsset, size: 30_000_000 }] },
      400,
    );
    await expectErr(
      {
        design: withPhoto(),
        assets: [{ ...photoAsset, contentType: "image/gif" }],
      },
      400,
    );
    await expectErr(
      { design: withPhoto(false), assets: [photoAsset] },
      422,
      /too blurry/,
    );
  });
});

describe("uploadDesignForOrder (phone side)", () => {
  const original = new Blob([new Uint8Array(10)], { type: "image/jpeg" });

  function deps(overrides: Record<string, unknown> = {}) {
    const calls: { method: string; url: string }[] = [];
    let putFailures = (overrides.putFailures as number) ?? 0;
    const fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", url });
      if (url === "/api/designs")
        return Response.json(
          {
            designId: "dsg9",
            uploads: [
              {
                assetId: "photo1",
                url: "https://r2/put",
                contentType: "image/jpeg",
              },
            ],
          },
          { status: 201 },
        );
      if (putFailures-- > 0) return new Response("", { status: 503 });
      return new Response("", { status: 200 });
    }) as unknown as typeof globalThis.fetch;
    return {
      calls,
      d: {
        fetch,
        loadDraft: () => withPhoto(),
        getAsset: async (id: string) =>
          id === "photo1" ? { original, mime: "image/jpeg" } : null,
        ...overrides,
      },
    };
  }

  it("creates the design, then PUTs each original straight to storage", async () => {
    const progress: string[] = [];
    const { d, calls } = deps({
      onProgress: (a: number, b: number) => progress.push(`${a}/${b}`),
    });
    await expect(uploadDesignForOrder("mug", d)).resolves.toEqual({
      designId: "dsg9",
    });
    expect(calls).toEqual([
      { method: "POST", url: "/api/designs" },
      { method: "PUT", url: "https://r2/put" },
    ]);
    expect(progress).toEqual(["0/1", "1/1"]);
  });

  it("retries a flaky upload", async () => {
    const { d, calls } = deps({ putFailures: 2 });
    await expect(uploadDesignForOrder("mug", d)).resolves.toEqual({
      designId: "dsg9",
    });
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(3);
  });

  it("explains missing drafts and photos in plain language", async () => {
    await expect(
      uploadDesignForOrder("mug", deps({ loadDraft: () => null }).d),
    ).rejects.toThrow(DesignUploadFailed);
    await expect(
      uploadDesignForOrder("mug", deps({ getAsset: async () => null }).d),
    ).rejects.toThrow(/no longer on this device/);
  });
});

describe("design thumbnail (task 22)", () => {
  it("hands out a thumbnail upload URL only when asked", async () => {
    const { storage } = createMemoryStorage("/x");
    const without = await createDesignUpload(
      { design: textOnly, assets: [] },
      storage,
      () => "dNoThumb",
    );
    expect(without.thumbnailUrl).toBeUndefined();
    const withThumb = await createDesignUpload(
      { design: textOnly, assets: [], thumbnail: true },
      storage,
      () => "dThumb",
    );
    expect(withThumb.thumbnailUrl).toBe("/x/designs/dThumb/thumbnail.webp");
  });
});
