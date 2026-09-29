import { AwsClient } from "aws4fetch";
import { assertFolderPrefix } from "./keys";
import type { ListedObject, ObjectStorage } from "./types";

/**
 * S3-compatible storage over plain fetch + SigV4 (aws4fetch, ~2 KB).
 * Works with Cloudflare R2 (region "auto"), IONOS, Nayatel, AWS, MinIO…
 * Path-style URLs: <endpoint>/<bucket>/<key>.
 */
export interface S3Config {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  fetch?: typeof fetch;
}

const encodeKey = (key: string) =>
  key.split("/").map(encodeURIComponent).join("/");

const MAX_LIST = 1000;
/** Parallel single-object DELETEs in deletePrefix (no Content-MD5 needed, unlike DeleteObjects). */
const DELETE_CONCURRENCY = 8;

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};
const unescapeXml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#")
      return String.fromCodePoint(
        e[1] === "x" || e[1] === "X"
          ? parseInt(e.slice(2), 16)
          : parseInt(e.slice(1), 10),
      );
    return XML_ENTITIES[e] ?? m;
  });
const tag = (xml: string, name: string) => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? unescapeXml(m[1]!) : undefined;
};

/** Parses a ListObjectsV2 response (only the fields we use). */
export function parseListObjectsV2(xml: string): {
  objects: ListedObject[];
  cursor?: string;
} {
  const objects: ListedObject[] = [];
  for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
    const block = m[1]!;
    const key = tag(block, "Key");
    const lastModified = tag(block, "LastModified");
    if (key === undefined || !lastModified)
      throw new Error("Storage list: malformed <Contents> entry");
    const ms = Date.parse(lastModified);
    if (Number.isNaN(ms))
      throw new Error(`Storage list: bad LastModified ${lastModified}`);
    objects.push({
      key,
      size: Number(tag(block, "Size") ?? 0),
      lastModified: new Date(ms).toISOString(),
    });
  }
  const truncated = tag(xml, "IsTruncated") === "true";
  const next = tag(xml, "NextContinuationToken");
  if (truncated && !next)
    throw new Error("Storage list: truncated without a continuation token");
  return truncated && next ? { objects, cursor: next } : { objects };
}

export function createS3Storage(cfg: S3Config): ObjectStorage {
  const aws = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: cfg.region ?? "auto",
    retries: 2,
  });
  const doFetch = cfg.fetch ?? fetch;
  const base = `${cfg.endpoint.replace(/\/+$/, "")}/${encodeURIComponent(cfg.bucket)}`;
  const url = (key: string) => `${base}/${encodeKey(key)}`;

  async function send(method: string, key: string, init: RequestInit = {}) {
    return sendUrl(method, url(key), init);
  }

  async function sendUrl(
    method: string,
    target: string,
    init: RequestInit = {},
  ) {
    const signed = await aws.sign(target, { method, ...init });
    // Send the ORIGINAL body, not the signed Request's stream: inside Next.js a
    // Request body goes out chunked without Content-Length, which R2 rejects
    // (411 MissingContentLength). Same bytes, so the signature still matches.
    return doFetch(signed.url, {
      method,
      headers: signed.headers,
      ...(init.body !== undefined ? { body: init.body } : {}),
    });
  }

  async function presign(
    method: string,
    key: string,
    expiresInS: number,
    query: Record<string, string> = {},
  ) {
    const u = new URL(url(key));
    u.searchParams.set(
      "X-Amz-Expires",
      String(Math.min(Math.max(expiresInS, 1), 7 * 24 * 3600)),
    );
    for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    const signed = await aws.sign(u.toString(), {
      method,
      aws: { signQuery: true },
    });
    return signed.url;
  }

  const fail = async (what: string, res: Response) => {
    const text = await res.text().catch(() => "");
    return new Error(
      `Storage ${what} failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  };

  async function listPage(
    prefix: string,
    opts: { cursor?: string; limit?: number } = {},
  ) {
    const u = new URL(base);
    u.searchParams.set("list-type", "2");
    u.searchParams.set("prefix", prefix);
    u.searchParams.set(
      "max-keys",
      String(
        Math.min(Math.max(Math.floor(opts.limit ?? MAX_LIST), 1), MAX_LIST),
      ),
    );
    if (opts.cursor) u.searchParams.set("continuation-token", opts.cursor);
    const res = await sendUrl("GET", u.toString());
    if (!res.ok) throw await fail(`LIST ${prefix}`, res);
    return parseListObjectsV2(await res.text());
  }

  async function deleteOne(key: string) {
    const res = await send("DELETE", key);
    if (!res.ok && res.status !== 404) throw await fail(`DELETE ${key}`, res);
  }

  return {
    list: listPage,
    async deletePrefix(prefix) {
      assertFolderPrefix(prefix);
      // Collect every key first, then delete: deleting while paging would
      // shift the listing under the continuation token.
      const keys: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await listPage(prefix, cursor ? { cursor } : {});
        for (const o of page.objects)
          if (o.key.startsWith(prefix)) keys.push(o.key);
        cursor = page.cursor;
      } while (cursor);
      for (let i = 0; i < keys.length; i += DELETE_CONCURRENCY)
        await Promise.all(keys.slice(i, i + DELETE_CONCURRENCY).map(deleteOne));
      return keys.length;
    },
    async put(key, body, opts = {}) {
      const res = await send("PUT", key, {
        body: typeof body === "string" ? body : (body as BodyInit),
        headers: opts.contentType ? { "content-type": opts.contentType } : {},
      });
      if (!res.ok) throw await fail(`PUT ${key}`, res);
    },
    async get(key) {
      const res = await send("GET", key);
      if (res.status === 404) return null;
      if (!res.ok) throw await fail(`GET ${key}`, res);
      return new Uint8Array(await res.arrayBuffer());
    },
    async head(key) {
      const res = await send("HEAD", key);
      if (res.status === 404) return null;
      if (!res.ok) throw await fail(`HEAD ${key}`, res);
      return {
        size: Number(res.headers.get("content-length") ?? 0),
        contentType: res.headers.get("content-type") ?? undefined,
      };
    },
    delete: deleteOne,
    presignPut: (key, opts) => presign("PUT", key, opts.expiresInS ?? 15 * 60),
    presignGet: (key, opts = {}) =>
      presign(
        "GET",
        key,
        opts.expiresInS ?? 5 * 60,
        opts.downloadName
          ? {
              "response-content-disposition": `attachment; filename="${opts.downloadName.replace(/"/g, "")}"`,
            }
          : {},
      ),
  };
}
