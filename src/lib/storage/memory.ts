import { assertFolderPrefix } from "./keys";
import type { ObjectStorage } from "./types";

export interface MemoryObject {
  body: Uint8Array;
  contentType?: string;
  /** ISO 8601; set on put (tests can overwrite it to age an object). */
  lastModified?: string;
}

/**
 * In-memory storage for local development, demos and tests (no R2 needed).
 * "Presigned" URLs point at /api/dev-storage/<key>, which only works while
 * this storage is active. Contents vanish when the server restarts.
 */
export function createMemoryStorage(
  baseUrl = "/api/dev-storage",
  opts: { now?: () => number } = {},
) {
  const now = opts.now ?? Date.now;
  const objects = new Map<string, MemoryObject>();
  const storage: ObjectStorage = {
    async put(key, body, putOpts = {}) {
      const bytes =
        typeof body === "string"
          ? new TextEncoder().encode(body)
          : new Uint8Array(body);
      objects.set(key, {
        body: bytes,
        contentType: putOpts.contentType,
        lastModified: new Date(now()).toISOString(),
      });
    },
    async get(key) {
      return objects.get(key)?.body ?? null;
    },
    async head(key) {
      const o = objects.get(key);
      return o ? { size: o.body.byteLength, contentType: o.contentType } : null;
    },
    async delete(key) {
      objects.delete(key);
    },
    async list(prefix, listOpts = {}) {
      const limit = Math.min(
        Math.max(Math.floor(listOpts.limit ?? 1000), 1),
        1000,
      );
      // Cursor = last key returned (S3's continuation token is opaque; ours is too).
      const keys = [...objects.keys()]
        .filter((k) => k.startsWith(prefix))
        .filter((k) => !listOpts.cursor || k > listOpts.cursor)
        .sort();
      const page = keys.slice(0, limit);
      const last = page.at(-1);
      return {
        objects: page.map((key) => {
          const o = objects.get(key)!;
          return {
            key,
            size: o.body.byteLength,
            lastModified: o.lastModified ?? new Date(0).toISOString(),
          };
        }),
        ...(keys.length > limit && last ? { cursor: last } : {}),
      };
    },
    async deletePrefix(prefix) {
      assertFolderPrefix(prefix);
      let n = 0;
      for (const key of [...objects.keys()])
        if (key.startsWith(prefix)) {
          objects.delete(key);
          n++;
        }
      return n;
    },
    presignPut: async (key) => `${baseUrl}/${key}`,
    presignGet: async (key) => `${baseUrl}/${key}`,
  };
  return { storage, objects };
}
