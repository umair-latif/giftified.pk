/**
 * Object storage (Cloudflare R2 or any S3-compatible service).
 * Server-only. Customer photos and print files are PRIVATE: never make the
 * bucket public; hand out short-lived presigned URLs instead.
 */
export interface StoredObjectInfo {
  size: number;
  contentType?: string;
}

/** One object from `list()`. */
export interface ListedObject {
  key: string;
  size: number;
  /** ISO 8601 (UTC). */
  lastModified: string;
}

export interface ListPage {
  objects: ListedObject[];
  /** Pass to the next `list()` call; absent on the last page. */
  cursor?: string;
}

export interface ObjectStorage {
  put(
    key: string,
    body: Uint8Array | string,
    opts?: { contentType?: string },
  ): Promise<void>;
  /** Null when the object doesn't exist. */
  get(key: string): Promise<Uint8Array | null>;
  head(key: string): Promise<StoredObjectInfo | null>;
  delete(key: string): Promise<void>;
  /**
   * One page of the objects whose key starts with `prefix`, in key order.
   * `limit` defaults to (and is capped at) 1000.
   */
  list(
    prefix: string,
    opts?: { cursor?: string; limit?: number },
  ): Promise<ListPage>;
  /**
   * Deletes every object under a FOLDER prefix (must end in "/", e.g.
   * "orders/5123/") and returns how many were deleted. Refuses an empty or
   * non-folder prefix so a typo can never wipe the bucket or a neighbour
   * ("orders/1" would also match "orders/10…"). Missing objects are fine.
   */
  deletePrefix(prefix: string): Promise<number>;
  /** URL a browser can PUT the file to directly (bypasses our 4.5 MB request limit). */
  presignPut(
    key: string,
    opts: { contentType: string; expiresInS?: number },
  ): Promise<string>;
  /** Short-lived download URL. */
  presignGet(
    key: string,
    opts?: { expiresInS?: number; downloadName?: string },
  ): Promise<string>;
}
