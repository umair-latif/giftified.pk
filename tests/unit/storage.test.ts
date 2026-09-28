import { describe, expect, it } from "vitest";
import { assetKey, designKey, printFileKey } from "@/lib/storage/keys";
import { createMemoryStorage } from "@/lib/storage/memory";
import { createS3Storage } from "@/lib/storage/s3";

describe("storage keys", () => {
  it("builds the documented layout", () => {
    expect(designKey("d1")).toBe("designs/d1/design.json");
    expect(assetKey("d1", "0f8e-aa")).toBe("designs/d1/assets/0f8e-aa");
    expect(printFileKey(5123, 0)).toBe("orders/5123/line-0/print.png");
  });

  it("refuses ids that could escape their folder", () => {
    for (const bad of ["../x", "a/b", "", ".hidden", "a b", "x".repeat(65)]) {
      expect(() => designKey(bad)).toThrow(/Invalid designId/);
    }
    expect(() => printFileKey(-1, 0)).toThrow();
    expect(() => printFileKey(1, 1.5)).toThrow();
  });
});

describe("S3/R2 adapter", () => {
  const seen: Request[] = [];
  const bodies: unknown[] = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    seen.push(req);
    bodies.push(init?.body);
    if (req.method === "GET" && req.url.includes("missing"))
      return new Response("", { status: 404 });
    if (req.method === "HEAD")
      return new Response(null, {
        status: 200,
        headers: { "content-length": "42", "content-type": "image/png" },
      });
    return new Response(req.method === "GET" ? "hello" : "", { status: 200 });
  }) as typeof fetch;

  const s3 = createS3Storage({
    endpoint: "https://acc123.r2.cloudflarestorage.com/",
    bucket: "giftified-test",
    accessKeyId: "AKID",
    secretAccessKey: "SECRET",
    fetch: fakeFetch,
  });

  it("uses path-style URLs and signs every request", async () => {
    await s3.put("designs/d1/design.json", "{}", {
      contentType: "application/json",
    });
    const req = seen.at(-1)!;
    expect(req.method).toBe("PUT");
    expect(req.url).toBe(
      "https://acc123.r2.cloudflarestorage.com/giftified-test/designs/d1/design.json",
    );
    expect(req.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/auto\/s3\/aws4_request/,
    );
  });

  it("hands fetch the raw bytes, so Content-Length is sent (R2 rejects chunked PUTs)", async () => {
    const png = new Uint8Array([137, 80, 78, 71]);
    await s3.put("orders/1/line-0/print.png", png, {
      contentType: "image/png",
    });
    expect(bodies.at(-1)).toBe(png);
    const req = seen.at(-1)!;
    // Signature doesn't cover the body, so sending it separately stays valid.
    expect(req.headers.get("x-amz-content-sha256")).toBe("UNSIGNED-PAYLOAD");
    expect(new Uint8Array(await req.arrayBuffer())).toEqual(png);
  });

  it("returns null for missing objects and reads existing ones", async () => {
    expect(await s3.get("missing/key")).toBeNull();
    expect(new TextDecoder().decode((await s3.get("some/key"))!)).toBe("hello");
    expect(await s3.head("x")).toEqual({ size: 42, contentType: "image/png" });
  });

  it("presigns uploads and downloads in the query string with an expiry", async () => {
    const put = new URL(
      await s3.presignPut("designs/d1/assets/a1", {
        contentType: "image/jpeg",
        expiresInS: 600,
      }),
    );
    expect(put.pathname).toBe("/giftified-test/designs/d1/assets/a1");
    expect(put.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(put.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);

    const get = new URL(
      await s3.presignGet("orders/1/line-0/print.png", {
        downloadName: "order-1.png",
      }),
    );
    expect(get.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(get.searchParams.get("response-content-disposition")).toBe(
      'attachment; filename="order-1.png"',
    );
  });
});

describe("memory storage", () => {
  it("round-trips bytes and strings", async () => {
    const { storage } = createMemoryStorage();
    await storage.put("a", "text", { contentType: "text/plain" });
    await storage.put("b", new Uint8Array([1, 2, 3]));
    expect(new TextDecoder().decode((await storage.get("a"))!)).toBe("text");
    expect(await storage.head("b")).toEqual({
      size: 3,
      contentType: undefined,
    });
    await storage.delete("a");
    expect(await storage.get("a")).toBeNull();
    expect(
      await storage.presignPut("designs/x/assets/y", {
        contentType: "image/png",
      }),
    ).toBe("/api/dev-storage/designs/x/assets/y");
  });
});
