import {
  fitFace,
  fontForFamily,
  normaliseWeight,
  type FontOption,
  type FontStyle,
  type FontWeight,
} from "@/config/fonts";

/**
 * Pure, dependency-free font clean-up for saved Fabric JSON (drafts, cart
 * designs, uploaded `design.json`). Used by the editor, the preview AND the
 * server print renderer, so all three agree on which face a text uses:
 *
 * - old device-font stacks → our self-hosted family
 *   (`"Arial, Helvetica, sans-serif"` → `"'Giftified Sans', sans-serif"`, …;
 *   see `aliases` in `src/config/fonts.ts`);
 * - numeric weights → "normal" | "bold";
 * - a weight/style the font has no real face for → the closest real one
 *   (Caveat italic → upright, Urdu bold → regular), never a faked face.
 *
 * Unknown families are left untouched. Returns a new object; input is not mutated.
 */
type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function migrateDesignFonts<T extends Json>(fabric: T): T {
  return walk(fabric, null) as T;
}

function walk(o: Json, inherited: FontOption | null): Json {
  const out: Json = { ...o };
  let font = inherited;
  if (typeof out.fontFamily === "string") {
    font = fontForFamily(out.fontFamily);
    if (font) {
      out.fontFamily = font.family;
      const face = fitFace(
        font,
        normaliseWeight(out.fontWeight),
        out.fontStyle === "italic" ? "italic" : "normal",
      );
      out.fontWeight = face.weight;
      out.fontStyle = face.style;
    }
  }
  if (Array.isArray(out.styles)) {
    out.styles = out.styles.map((s: unknown) =>
      isObj(s) && isObj(s.style) ? { ...s, style: fixStyle(s.style, font) } : s,
    );
  }
  if (Array.isArray(out.objects))
    out.objects = out.objects.map((c: unknown) =>
      isObj(c) ? walk(c, null) : c,
    );
  if (isObj(out.clipPath)) out.clipPath = walk(out.clipPath, null);
  return out;
}

/** Per-character style overrides (Fabric `styles` entries). */
function fixStyle(style: Json, base: FontOption | null): Json {
  const out: Json = { ...style };
  let font = base;
  if (typeof out.fontFamily === "string") {
    font = fontForFamily(out.fontFamily);
    if (font) out.fontFamily = font.family;
  }
  if (!font || (out.fontWeight === undefined && out.fontStyle === undefined))
    return out;
  const fitted = fitFace(
    font,
    out.fontWeight === undefined ? "normal" : normaliseWeight(out.fontWeight),
    out.fontStyle === "italic" ? "italic" : "normal",
  );
  if (out.fontWeight !== undefined) out.fontWeight = fitted.weight;
  if (out.fontStyle !== undefined) out.fontStyle = fitted.style;
  return out;
}

export interface FaceRef {
  font: FontOption;
  weight: FontWeight;
  style: FontStyle;
}

/**
 * Every font face a (migrated) design uses, de-duplicated — what must be
 * loaded before it renders. Unknown families are skipped.
 */
export function designFontFaces(fabric: Json): FaceRef[] {
  const found = new Map<string, FaceRef>();
  const add = (font: FontOption | null, weight: unknown, style: unknown) => {
    if (!font) return;
    const face = fitFace(
      font,
      normaliseWeight(weight),
      style === "italic" ? "italic" : "normal",
    );
    found.set(`${font.id}/${face.weight}/${face.style}`, { font, ...face });
  };
  const visit = (o: Json) => {
    if (typeof o.fontFamily === "string") {
      const font = fontForFamily(o.fontFamily);
      add(font, o.fontWeight, o.fontStyle);
      if (Array.isArray(o.styles)) {
        for (const s of o.styles) {
          if (!isObj(s) || !isObj(s.style)) continue;
          const st = s.style;
          add(
            typeof st.fontFamily === "string"
              ? fontForFamily(st.fontFamily)
              : font,
            st.fontWeight ?? o.fontWeight,
            st.fontStyle ?? o.fontStyle,
          );
        }
      }
    }
    if (Array.isArray(o.objects)) o.objects.filter(isObj).forEach(visit);
  };
  visit(fabric);
  return [...found.values()];
}
