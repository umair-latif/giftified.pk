import "server-only";
import { z } from "zod";
import { createMemoryStorage } from "./memory";
import { createS3Storage } from "./s3";
import type { ObjectStorage } from "./types";

export type * from "./types";
export * from "./keys";

const envSchema = z.object({
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
});

let storage: ObjectStorage | undefined;
let memory = false;

/**
 * The one entry point for file storage: R2/S3 when the four STORAGE_* vars are
 * set; otherwise in-memory storage for local development and demo builds
 * (COMMERCE_MOCK=1). A production build without storage refuses to start it,
 * so customer photos can never silently land in a server's memory.
 */
export function getStorage(
  env: Record<string, string | undefined> = process.env,
): ObjectStorage {
  if (storage) return storage;
  if (env.STORAGE_ENDPOINT) {
    const parsed = envSchema.safeParse(env);
    if (!parsed.success) {
      const fields = parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ");
      throw new Error(`Storage env is incomplete or invalid: ${fields}`);
    }
    const e = parsed.data;
    storage = createS3Storage({
      endpoint: e.STORAGE_ENDPOINT,
      bucket: e.STORAGE_BUCKET,
      accessKeyId: e.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: e.STORAGE_SECRET_ACCESS_KEY,
    });
    return storage;
  }
  if (env.NODE_ENV === "production" && env.COMMERCE_MOCK !== "1") {
    throw new Error(
      "STORAGE_* is not set in production. Configure R2 (see .env.example) or set COMMERCE_MOCK=1 for a demo build.",
    );
  }
  // One store per process: route handlers and server actions can be separate
  // bundles with their own copy of this module, but must see the same files.
  const g = globalThis as { __giftifiedMemoryStorage?: ObjectStorage };
  g.__giftifiedMemoryStorage ??= createMemoryStorage().storage;
  storage = g.__giftifiedMemoryStorage;
  memory = true;
  return storage;
}

/** True when the in-memory dev storage is active (enables /api/dev-storage). */
export function isMemoryStorage(): boolean {
  getStorage();
  return memory;
}
