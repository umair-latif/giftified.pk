import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { tileClass, tileIsMagenta } from "@/features/home/tile-style";
import { createMemoryStorage } from "@/lib/storage/memory";
import { saveTemplate } from "@/server/templates";
import type { DesignDocument } from "@/types/design";

vi.mock("server-only", () => ({}));
const { loadRecentTemplates } =
  await import("@/features/home/recent-templates");

describe("occasion tile colours", () => {
  it.each([2, 4])(
    "no two neighbours match and no column is one colour (%i columns)",
    (cols) => {
      const n = 7;
      const at = (i: number) => tileIsMagenta(i, cols);
      for (let i = 0; i < n; i++) {
        if ((i + 1) % cols !== 0 && i + 1 < n)
          expect(at(i)).not.toBe(at(i + 1));
        if (i + cols < n && (cols === 4 || i + cols !== 6))
          expect(at(i)).not.toBe(at(i + cols));
      }
      for (let c = 0; c < cols; c++) {
        const colColours = new Set(
          Array.from({ length: n }, (_, i) => i)
            .filter((i) => i % cols === c)
            .map(at),
        );
        const inColumn = Array.from({ length: n }, (_, i) => i).filter(
          (i) => i % cols === c,
        ).length;
        if (inColumn > 1) expect(colColours.size).toBe(2);
      }
    },
  );

  it("gives a phone class and a wider-screen class for every tile", () => {
    for (let i = 0; i < 7; i++) {
      const c = tileClass(i);
      expect(c).toMatch(/\bbg-(magenta|sunny)\b/);
      expect(c).toMatch(/\bsm:bg-(magenta|sunny)\b/);
    }
  });
});

describe("loadRecentTemplates", () => {
  const design = JSON.parse(
    readFileSync(
      new URL("../fixtures/design-mug.json", import.meta.url),
      "utf8",
    ),
  ) as DesignDocument;
  const save = (
    storage: ReturnType<typeof createMemoryStorage>["storage"],
    name: string,
    iso: string,
    over: { published?: boolean; thumbnail?: boolean } = {},
  ) =>
    saveTemplate(
      {
        name,
        productId: "mug",
        occasions: ["eid"],
        published: over.published ?? true,
        design,
        assets: [],
        ...(over.thumbnail ? { thumbnail: new Uint8Array([1]) } : {}),
      },
      storage,
      () => name.toLowerCase().replace(/\W/g, ""),
      () => new Date(iso),
    );

  it("is empty when there are no templates", async () => {
    expect(await loadRecentTemplates(6, createMemoryStorage().storage)).toEqual(
      [],
    );
  });

  it("lists published templates newest first, with editor links and thumbnails when present", async () => {
    const { storage } = createMemoryStorage();
    await save(storage, "Old one", "2026-09-01T00:00:00Z");
    await save(storage, "New one", "2026-09-20T00:00:00Z", { thumbnail: true });
    await save(storage, "Hidden", "2026-09-25T00:00:00Z", { published: false });
    const list = await loadRecentTemplates(6, storage);
    expect(list.map((t) => t.name)).toEqual(["New one", "Old one"]);
    expect(list[0]).toMatchObject({
      href: "/design/mug?template=newone",
      productName: "Custom Mug",
    });
    expect(list[0]!.thumbnailUrl).toContain("templates/newone/");
    expect(list[1]!.thumbnailUrl).toBeNull();
  });

  it("honours the limit and never throws when storage fails", async () => {
    const { storage } = createMemoryStorage();
    for (let i = 0; i < 4; i++)
      await save(storage, `T${i}`, `2026-09-0${i + 1}T00:00:00Z`);
    expect(await loadRecentTemplates(2, storage)).toHaveLength(2);
    const broken = {
      ...storage,
      get: async () => {
        throw new Error("down");
      },
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await loadRecentTemplates(6, broken as typeof storage)).toEqual([]);
    warn.mockRestore();
  });
});
