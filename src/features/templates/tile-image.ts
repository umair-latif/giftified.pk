import type { TemplateMeta } from "@/server/templates/types";

/**
 * Which stored mockup a design tile shows. A design product keeps several
 * mockups (labels such as "Left", "Right", "Front", "Lifestyle", "Flat lay",
 * or "Design" for the flat artwork). A grid looks better when tiles mix the
 * plain product shots with the lifestyle ones, so each design gets one of the
 * two kinds, chosen by a hash of its id: it looks random across the grid but a
 * given design always shows the same picture (no flicker, no hydration
 * mismatch, and the cached page stays valid).
 *
 * Plain = the side views (mugs: the handle is visible), else any non-lifestyle
 * shot. The flat "Design" artwork is only used when nothing else exists.
 */
const LIFESTYLE = /lifestyle|flat\s*-?lay/i;
const SIDE = /^(left|right)$/i;
const FLAT_ART = /^design$/i;

/** FNV-1a, 32 bit: small, stable and well spread for short ids. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickTileImage(
  id: string,
  images: readonly { label: string }[] | undefined,
): number | null {
  if (!images || images.length === 0) return null;
  const all = images.map((img, i) => ({ i, label: img.label }));
  const lifestyle = all.filter((x) => LIFESTYLE.test(x.label)).map((x) => x.i);
  const sides = all.filter((x) => SIDE.test(x.label)).map((x) => x.i);
  const otherPlain = all
    .filter((x) => !LIFESTYLE.test(x.label) && !FLAT_ART.test(x.label))
    .map((x) => x.i);
  const plain = sides.length > 0 ? sides : otherPlain;
  const h = hashId(id);
  const pools = [plain, lifestyle].filter((p) => p.length > 0);
  if (pools.length === 0) return 0; // only the flat artwork
  const pool = pools[h % pools.length]!;
  return pool[(h >>> 1) % pool.length] ?? pool[0] ?? 0;
}

/** Where a tile links: the design product page, else the editor with the template loaded. */
export function templateHref(
  t: Pick<TemplateMeta, "id" | "productId" | "product">,
): string {
  return t.product
    ? `/designs/${t.product.slug}`
    : `/design/${t.productId}?template=${encodeURIComponent(t.id)}`;
}

/** The picture a tile shows: a stored mockup, else the flat thumbnail. */
export function tileImage(
  t: Pick<TemplateMeta, "id" | "images" | "hasThumbnail">,
): { src: string; kind: "mockup" | "art" } | null {
  const id = encodeURIComponent(t.id);
  const n = pickTileImage(t.id, t.images);
  if (n !== null)
    return { src: `/api/templates/${id}/images/${n}`, kind: "mockup" };
  return t.hasThumbnail
    ? { src: `/api/templates/${id}/thumbnail`, kind: "art" }
    : null;
}
