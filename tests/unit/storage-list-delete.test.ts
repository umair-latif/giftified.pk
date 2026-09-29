import { describe, expect, it } from "vitest";
import {
  assertFolderPrefix,
  designFolder,
  designIdFromKey,
  orderFolder,
} from "@/lib/storage/keys";
import { createMemoryStorage } from "@/lib/storage/memory";
import { createS3Storage, parseListObjectsV2 } from "@/lib/storage/s3";

/** Storage list + deletePrefix (task 24, retention). */

describe("folder prefixes", () => {
  it("builds and guards prefixes", () => {
    expect(designFolder("d1")).toBe("designs/d1/");
    expect(orderFolder(5123)).toBe("orders/5123/");
    expect(() => designFolder("../x")).toThrow();
    expect(() => orderFolder(0)).toThrow();
    expect(designIdFromKey("designs/d1/assets/a")).toBe("d1");
    expect(designIdFromKey("designs/d1")).toBeNull();
    expect(designIdFromKey("designs/../x")).toBeNull();
    expect(designIdFromKey("orders/1/x")).toBeNull();
    for (const bad of [
      "",
      "/",
      "orders",
      "orders/1",
      "/orders/",
      "a//",
      "a/../",
      "./",
    ])
      expect(() => assertFolderPrefix(bad)).toThrow(/Refusing/);
    expect(assertFolderPrefix("orders/1/")).toBe("orders/1/");
  });
});

/** Fake bucket that speaks ListObjectsV2 (at most 2 keys per page) and DELETE. */
function fakeBucket(keys: string[]) {
  const store = new Set(keys);
  const calls: Request[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    calls.push(req);
    const u = new URL(req.url);
    if (req.method === "GET" && u.searchParams.get("list-type") === "2") {
      const prefix = u.searchParams.get("prefix") ?? "";
      const max = Math.min(Number(u.searchParams.get("max-keys")), 2);
      const after = u.searchParams.get("continuation-token");
      const all = [...store]
        .filter((k) => k.startsWith(prefix))
        .filter((k) => !after || k > after)
        .sort();
      const page = all.slice(0, max);
      const more = all.length > max;
      const contents = page
        .map(
          (k) =>
            `<Contents><Key>${k.replace(/&/g, "&amp;")}</Key><LastModified>2026-08-01T10:00:00.000Z</LastModified><ETag>&quot;x&quot;</ETag><Size>12</Size><StorageClass>STANDARD</StorageClass></Contents>`,
        )
        .join("");
      const token = more
        ? `<NextContinuationToken>${page.at(-1)!.replace(/&/g, "&amp;")}</NextContinuationToken>`
        : "";
      const xml = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>bucket</Name><Prefix>${prefix}</Prefix><KeyCount>${page.length}</KeyCount><MaxKeys>${max}</MaxKeys><IsTruncated>${more}</IsTruncated>${contents}${token}</ListBucketResult>`;
      return new Response(xml, { status: 200 });
    }
    if (req.method === "DELETE") {
      const key = u.pathname
        .replace(/^\/bucket\//, "")
        .split("/")
        .map(decodeURIComponent)
        .join("/");
      store.delete(key);
      return new Response(null, { status: 204 });
    }
    return new Response("unexpected", { status: 500 });
  }) as typeof fetch;
  const s3 = createS3Storage({
    endpoint: "https://acc.r2.cloudflarestorage.com",
    bucket: "bucket",
    accessKeyId: "AKID",
    secretAccessKey: "SECRET",
    fetch: fetchFn,
  });
  return { s3, store, calls };
}

describe("S3/R2 list + deletePrefix", () => {
  it("lists with signed ListObjectsV2 and follows continuation tokens", async () => {
    const { s3, calls } = fakeBucket([
      "designs/a/design.json",
      "designs/a/assets/p&1",
      "designs/b/design.json",
      "orders/1/line-0/print.png",
    ]);
    const first = await s3.list("designs/", { limit: 2 });
    const req = calls.at(-1)!;
    const u = new URL(req.url);
    expect(u.pathname).toBe("/bucket");
    expect(u.searchParams.get("prefix")).toBe("designs/");
    expect(u.searchParams.get("max-keys")).toBe("2");
    expect(req.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256/);
    expect(first.objects).toEqual([
      {
        key: "designs/a/assets/p&1",
        size: 12,
        lastModified: "2026-08-01T10:00:00.000Z",
      },
      {
        key: "designs/a/design.json",
        size: 12,
        lastModified: "2026-08-01T10:00:00.000Z",
      },
    ]);
    expect(first.cursor).toBe("designs/a/design.json");

    const second = await s3.list("designs/", { cursor: first.cursor! });
    expect(
      new URL(calls.at(-1)!.url).searchParams.get("continuation-token"),
    ).toBe("designs/a/design.json");
    expect(new URL(calls.at(-1)!.url).searchParams.get("max-keys")).toBe(
      "1000",
    );
    expect(second.objects.map((o) => o.key)).toEqual(["designs/b/design.json"]);
    expect(second.cursor).toBeUndefined();
  });

  it("deletePrefix deletes every page under the folder and nothing else", async () => {
    const { s3, store, calls } = fakeBucket([
      "orders/1/line-0/print.png",
      "orders/1/line-0/proof.pdf",
      "orders/1/line-1/print.png",
      "orders/1/line-1/proof.pdf",
      "orders/1/line-2/print.png",
      "orders/10/line-0/print.png",
      "designs/x/design.json",
    ]);
    expect(await s3.deletePrefix("orders/1/")).toBe(5);
    expect([...store].sort()).toEqual([
      "designs/x/design.json",
      "orders/10/line-0/print.png",
    ]);
    const deletes = calls.filter((c) => c.method === "DELETE");
    expect(deletes).toHaveLength(5);
    expect(deletes[0]!.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256/,
    );
    // Idempotent: nothing left → 0, no error.
    expect(await s3.deletePrefix("orders/1/")).toBe(0);
  });

  it("refuses non-folder prefixes before any request", async () => {
    const { s3, calls } = fakeBucket(["orders/1/a", "orders/10/a"]);
    for (const bad of ["orders/1", "", "/", "orders//"])
      await expect(s3.deletePrefix(bad)).rejects.toThrow(/Refusing/);
    expect(calls).toHaveLength(0);
  });

  it("fails loudly on a list error or a truncated page without a token", async () => {
    const failing = createS3Storage({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      bucket: "bucket",
      accessKeyId: "AKID",
      secretAccessKey: "SECRET",
      fetch: (async () =>
        new Response("denied", { status: 403 })) as typeof fetch,
    });
    await expect(failing.list("designs/")).rejects.toThrow(
      /LIST designs\/ failed \(403\)/,
    );
    await expect(failing.deletePrefix("designs/a/")).rejects.toThrow(/403/);
    expect(() =>
      parseListObjectsV2(
        "<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>",
      ),
    ).toThrow(/continuation/);
    expect(() =>
      parseListObjectsV2(
        "<ListBucketResult><Contents><Key>a</Key><LastModified>nope</LastModified></Contents></ListBucketResult>",
      ),
    ).toThrow(/LastModified/);
  });
});

describe("memory list + deletePrefix", () => {
  it("lists in key order with a cursor and records lastModified", async () => {
    let now = Date.parse("2026-08-01T00:00:00Z");
    const { storage } = createMemoryStorage("/x", { now: () => now });
    await storage.put("designs/b/design.json", "{}");
    now += 1000;
    await storage.put("designs/a/design.json", "{}");
    await storage.put("orders/1/line-0/print.png", "png");
    const p1 = await storage.list("designs/", { limit: 1 });
    expect(p1.objects).toEqual([
      {
        key: "designs/a/design.json",
        size: 2,
        lastModified: "2026-08-01T00:00:01.000Z",
      },
    ]);
    const p2 = await storage.list("designs/", {
      cursor: p1.cursor!,
      limit: 1,
    });
    expect(p2.objects.map((o) => o.key)).toEqual(["designs/b/design.json"]);
    expect(p2.objects[0]!.lastModified).toBe("2026-08-01T00:00:00.000Z");
    expect(p2.cursor).toBeUndefined();
  });

  it("deletePrefix only removes that folder", async () => {
    const { storage, objects } = createMemoryStorage();
    for (const k of [
      "orders/1/a",
      "orders/1/b/c",
      "orders/10/a",
      "designs/1/x",
    ])
      await storage.put(k, "x");
    expect(await storage.deletePrefix("orders/1/")).toBe(2);
    expect([...objects.keys()].sort()).toEqual(["designs/1/x", "orders/10/a"]);
    expect(await storage.deletePrefix("orders/1/")).toBe(0);
    await expect(storage.deletePrefix("orders")).rejects.toThrow(/Refusing/);
  });
});
