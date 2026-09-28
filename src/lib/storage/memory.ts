import type { ObjectStorage } from "./types";

/**
 * In-memory storage for local development, demos and tests (no R2 needed).
 * "Presigned" URLs point at /api/dev-storage/<key>, which only works while
 * this storage is active. Contents vanish when the server restarts.
 */
export function createMemoryStorage(baseUrl = "/api/dev-storage") {
  const objects = new Map<string, { body: Uint8Array; contentType?: string }>();
  const storage: ObjectStorage = {
    async put(key, body, opts = {}) {
      const bytes =
        typeof body === "string"
          ? new TextEncoder().encode(body)
          : new Uint8Array(body);
      objects.set(key, { body: bytes, contentType: opts.contentType });
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
    presignPut: async (key) => `${baseUrl}/${key}`,
    presignGet: async (key) => `${baseUrl}/${key}`,
  };
  return { storage, objects };
}
