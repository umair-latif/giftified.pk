/**
 * Object storage (Cloudflare R2 or any S3-compatible service).
 * Server-only. Customer photos and print files are PRIVATE: never make the
 * bucket public; hand out short-lived presigned URLs instead.
 */
export interface StoredObjectInfo {
  size: number;
  contentType?: string;
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
