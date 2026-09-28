import { AwsClient } from "aws4fetch";
import type { ObjectStorage } from "./types";

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
    const signed = await aws.sign(url(key), { method, ...init });
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

  return {
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
    async delete(key) {
      const res = await send("DELETE", key);
      if (!res.ok && res.status !== 404) throw await fail(`DELETE ${key}`, res);
    },
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
