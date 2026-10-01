import "server-only";
import { z } from "zod";
import { newId } from "@/lib/id";
import {
  getStorage,
  sampleIndexKey,
  sampleKey,
  type ObjectStorage,
} from "@/lib/storage";

/**
 * Sample photo library: the photos designers put in a design's "customer's
 * photo" slots. Customers always replace them, so they are never printed and
 * stay small (≤2048 px WebP made on the designer's phone). A published design
 * keeps its own copy, so deleting a sample never breaks a design.
 *
 *   samples/index.json   the list
 *   samples/<id>         the photo
 */
export interface SamplePhoto {
  id: string;
  widthPx: number;
  heightPx: number;
  contentType: string;
  /** ISO 8601 (UTC). */
  createdAt: string;
  createdBy?: string;
}

export const SAMPLE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
export const MAX_SAMPLE_BYTES = 3 * 1024 * 1024;

const sampleSchema = z.object({
  id: z.string(),
  widthPx: z.number().int().positive(),
  heightPx: z.number().int().positive(),
  contentType: z.enum(SAMPLE_TYPES),
  createdAt: z.string(),
  createdBy: z.string().optional(),
});

export class SampleError extends Error {}

async function readIndex(storage: ObjectStorage): Promise<SamplePhoto[]> {
  const raw = await storage.get(sampleIndexKey());
  if (!raw) return [];
  const parsed = z
    .array(sampleSchema)
    .safeParse(JSON.parse(new TextDecoder().decode(raw)));
  return parsed.success ? parsed.data : [];
}

async function writeIndex(storage: ObjectStorage, list: SamplePhoto[]) {
  await storage.put(sampleIndexKey(), JSON.stringify(list), {
    contentType: "application/json",
  });
}

/** Newest first. */
export async function listSamples(
  storage: ObjectStorage = getStorage(),
): Promise<SamplePhoto[]> {
  return (await readIndex(storage)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getSample(
  id: string,
  storage: ObjectStorage = getStorage(),
): Promise<SamplePhoto | null> {
  return (await readIndex(storage)).find((s) => s.id === id) ?? null;
}

export async function addSample(
  input: {
    bytes: Uint8Array;
    contentType: string;
    widthPx: number;
    heightPx: number;
    createdBy?: string;
  },
  storage: ObjectStorage = getStorage(),
  makeId: () => string = newId,
  now: () => Date = () => new Date(),
): Promise<SamplePhoto> {
  const type = SAMPLE_TYPES.find((t) => t === input.contentType);
  if (!type) throw new SampleError("Use a JPEG, PNG or WebP photo");
  if (!input.bytes.byteLength || input.bytes.byteLength > MAX_SAMPLE_BYTES)
    throw new SampleError("That photo is too large for a sample");
  const size = (n: number) => Number.isInteger(n) && n > 0 && n <= 4096;
  if (!size(input.widthPx) || !size(input.heightPx))
    throw new SampleError("Invalid photo size");

  const sample: SamplePhoto = {
    id: makeId(),
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    contentType: type,
    createdAt: now().toISOString(),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
  };
  await storage.put(sampleKey(sample.id), input.bytes, { contentType: type });
  await writeIndex(storage, [...(await readIndex(storage)), sample]);
  return sample;
}

/** Removes a sample from the library. Designs that used it keep their own copy. */
export async function deleteSample(
  id: string,
  storage: ObjectStorage = getStorage(),
): Promise<boolean> {
  const list = await readIndex(storage);
  if (!list.some((s) => s.id === id)) return false;
  await writeIndex(
    storage,
    list.filter((s) => s.id !== id),
  );
  await storage.delete(sampleKey(id));
  return true;
}

/** The library with short-lived URLs to show the photos (bucket stays private). */
export async function samplesWithUrls(
  storage: ObjectStorage = getStorage(),
): Promise<(SamplePhoto & { url: string })[]> {
  return Promise.all(
    (await listSamples(storage)).map(async (s) => ({
      ...s,
      url: await storage.presignGet(sampleKey(s.id), { expiresInS: 30 * 60 }),
    })),
  );
}
