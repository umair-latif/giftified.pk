/**
 * Object keys. One place so every module agrees where things live, and so
 * user-supplied IDs can never escape their prefix (no "..", slashes, etc.).
 *
 *   designs/<designId>/design.json          saved DesignDocument
 *   designs/<designId>/assets/<assetId>      ORIGINAL uploaded photo
 *   orders/<orderId>/line-<n>/print.png      300 DPI print file
 *   orders/<orderId>/line-<n>/proof.pdf      VendorProof.pdf
 *
 * Folder prefixes (`designFolder`, `orderFolder`) are what the retention job
 * (task 24) deletes; `assertFolderPrefix` guards every prefix delete.
 */
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function assertSafeId(id: string, what = "id"): string {
  if (!ID.test(id)) throw new Error(`Invalid ${what}: ${JSON.stringify(id)}`);
  return id;
}

export const designKey = (designId: string) =>
  `designs/${assertSafeId(designId, "designId")}/design.json`;

export const assetKey = (designId: string, assetId: string) =>
  `designs/${assertSafeId(designId, "designId")}/assets/${assertSafeId(assetId, "assetId")}`;

export const printFileKey = (orderId: number, lineIndex: number) =>
  `orders/${orderPart(orderId)}/line-${linePart(lineIndex)}/print.png`;

export const proofFileKey = (orderId: number, lineIndex: number) =>
  `orders/${orderPart(orderId)}/line-${linePart(lineIndex)}/proof.pdf`;

function orderPart(orderId: number): number {
  if (!Number.isInteger(orderId) || orderId <= 0)
    throw new Error(`Invalid orderId: ${orderId}`);
  return orderId;
}

function linePart(i: number): number {
  if (!Number.isInteger(i) || i < 0 || i > 99)
    throw new Error(`Invalid line index: ${i}`);
  return i;
}

/** "designs/<designId>/" — everything stored for one design (JSON + photos). */
export const designFolder = (designId: string) =>
  `designs/${assertSafeId(designId, "designId")}/`;

/** "orders/<orderId>/" — every print file and proof of one order. */
export const orderFolder = (orderId: number) => `orders/${orderPart(orderId)}/`;

/** Design id of a key under designs/, or null. */
export function designIdFromKey(key: string): string | null {
  const m = /^designs\/([^/]+)\//.exec(key);
  return m && ID.test(m[1]!) ? m[1]! : null;
}

/**
 * A prefix that is safe to delete everything under: non-empty folder path
 * ending in "/", no leading "/", no empty or dot segments.
 */
export function assertFolderPrefix(prefix: string): string {
  const parts = prefix.split("/");
  const ok =
    prefix.endsWith("/") &&
    parts.length >= 2 &&
    parts.slice(0, -1).every((p) => p !== "" && p !== "." && p !== "..");
  if (!ok)
    throw new Error(`Refusing to delete prefix ${JSON.stringify(prefix)}`);
  return prefix;
}
