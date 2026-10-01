/**
 * Object keys. One place so every module agrees where things live, and so
 * user-supplied IDs can never escape their prefix (no "..", slashes, etc.).
 *
 *   designs/<designId>/design.json          saved DesignDocument
 *   designs/<designId>/assets/<assetId>      ORIGINAL uploaded photo
 *   orders/<orderId>/line-<n>/print.png      300 DPI print file
 *   orders/<orderId>/line-<n>/proof.pdf      VendorProof.pdf
 *   templates/index.json                     template list (task 18)
 *   templates/<id>/design.json               template DesignDocument
 *   templates/<id>/assets/<assetId>          customer's photo: its sample; artwork: the ORIGINAL
 *   templates/<id>/previews/<assetId>        artwork: ≤2048 px preview the editor shows
 *   templates/<id>/thumbnail.webp            gallery thumbnail
 *   templates/<id>/images/<n>.webp           product images (mockups), n = 0…
 *   designs/<designId>/thumbnail.webp        small preview (signed-in orders, task 22)
 *   accounts/<customerId>/designs/<id>/…     a customer's saved design (task 22):
 *        design.json, pending.json (while photos upload), assets/<assetId>, thumbnail.webp
 *   samples/index.json                       sample photo library (designers)
 *   samples/<sampleId>                       one sample photo (≤2048 px, never printed)
 *
 * The retention job (task 24) only ever lists `designs/` and deletes
 * `orders/<n>/` and `designs/<id>/`; `accounts/`, `templates/` and `samples/`
 * are never purged by it.
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

export const templateIndexKey = () => "templates/index.json";

export const templateDesignKey = (templateId: string) =>
  `templates/${assertSafeId(templateId, "templateId")}/design.json`;

export const templateAssetKey = (templateId: string, assetId: string) =>
  `templates/${assertSafeId(templateId, "templateId")}/assets/${assertSafeId(assetId, "assetId")}`;

export const templateThumbKey = (templateId: string) =>
  `templates/${assertSafeId(templateId, "templateId")}/thumbnail.webp`;

export const templateImageKey = (templateId: string, index: number) => {
  if (!Number.isInteger(index) || index < 0 || index > 19)
    throw new Error(`Invalid image index: ${index}`);
  return `templates/${assertSafeId(templateId, "templateId")}/images/${index}.webp`;
};

/** "templates/<id>/" — everything stored for one template (design, photos, images, thumbnail). */
export const templateFolder = (templateId: string) =>
  `templates/${assertSafeId(templateId, "templateId")}/`;

export const designThumbKey = (designId: string) =>
  `designs/${assertSafeId(designId, "designId")}/thumbnail.webp`;

function customerPart(customerId: number): number {
  if (!Number.isInteger(customerId) || customerId <= 0)
    throw new Error(`Invalid customerId: ${customerId}`);
  return customerId;
}

/** "accounts/<customerId>/" — everything stored for one account. */
export const accountFolder = (customerId: number) =>
  `accounts/${customerPart(customerId)}/`;

/** "accounts/<customerId>/designs/<id>/" — one saved design (JSON, photos, thumbnail). */
export const savedDesignFolder = (customerId: number, savedId: string) =>
  `${accountFolder(customerId)}designs/${assertSafeId(savedId, "savedId")}/`;

export const savedDesignKey = (customerId: number, savedId: string) =>
  `${savedDesignFolder(customerId, savedId)}design.json`;

/** The design while its photos are still uploading (becomes design.json on finish). */
export const savedPendingKey = (customerId: number, savedId: string) =>
  `${savedDesignFolder(customerId, savedId)}pending.json`;

export const savedAssetKey = (
  customerId: number,
  savedId: string,
  assetId: string,
) =>
  `${savedDesignFolder(customerId, savedId)}assets/${assertSafeId(assetId, "assetId")}`;

export const savedThumbKey = (customerId: number, savedId: string) =>
  `${savedDesignFolder(customerId, savedId)}thumbnail.webp`;

/** Artwork photo of a published design: the ≤2048 px copy the editor shows. */
export const templatePreviewKey = (templateId: string, assetId: string) =>
  `templates/${assertSafeId(templateId, "templateId")}/previews/${assertSafeId(assetId, "assetId")}`;

export const sampleIndexKey = () => "samples/index.json";

export const sampleKey = (sampleId: string) =>
  `samples/${assertSafeId(sampleId, "sampleId")}`;
