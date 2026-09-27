/**
 * Browser-side store for uploaded images until checkout uploads them to object
 * storage. Keeps the ORIGINAL file (for printing) and a compressed PREVIEW
 * (for the editor). IndexedDB when available, in-memory otherwise (private
 * mode): the editor still works, the photo just won't survive a reload.
 */
export interface StoredAsset {
  id: string;
  name: string;
  mime: string;
  /** Pixel size of the original, after EXIF orientation. */
  widthPx: number;
  heightPx: number;
  original: Blob;
  preview: Blob;
  createdAt: number;
}

const DB_NAME = "giftified";
const STORE = "assets";
const memory = new Map<string, StoredAsset>();
const urlCache = new Map<string, string>();
let dbPromise: Promise<IDBDatabase | null> | undefined;

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAsset(asset: StoredAsset): Promise<void> {
  memory.set(asset.id, asset);
  const db = await openDb();
  if (db) await tx(db, "readwrite", (s) => s.put(asset)).catch(() => undefined);
}

export async function getAsset(id: string): Promise<StoredAsset | null> {
  const hit = memory.get(id);
  if (hit) return hit;
  const db = await openDb();
  if (!db) return null;
  const found = await tx<StoredAsset | undefined>(db, "readonly", (s) =>
    s.get(id),
  ).catch(() => undefined);
  if (found) memory.set(id, found);
  return found ?? null;
}

/** Object URL for the compressed preview; cached for the page's lifetime. */
export async function previewUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  const asset = await getAsset(id);
  if (!asset) return null;
  const url = URL.createObjectURL(asset.preview);
  urlCache.set(id, url);
  return url;
}

/** Deletes stored assets not referenced by any draft (called after a draft loads). */
export async function pruneAssets(keep: ReadonlySet<string>): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const keys: IDBValidKey[] = await tx<IDBValidKey[]>(db, "readonly", (s) =>
    s.getAllKeys(),
  ).catch(() => []);
  await Promise.all(
    keys
      .filter((k): k is string => typeof k === "string" && !keep.has(k))
      .map((k) => {
        memory.delete(k);
        return tx(db, "readwrite", (s) => s.delete(k)).catch(() => undefined);
      }),
  );
}
