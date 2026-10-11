import { fitFace, fontForFamily, hasFace } from "@/config/fonts";
import type { TextStyle } from "./engine/text-style";

/**
 * Whether Bold / Italic can be switched for this text: only where the font
 * has a REAL face for the result (the print can't fake one the way a browser
 * does), e.g. no italic for Caveat, neither for the Urdu fonts.
 */
export function faceToggles(text: TextStyle): {
  canBold: boolean;
  canItalic: boolean;
} {
  const font = fontForFamily(text.fontFamily);
  if (!font) return { canBold: true, canItalic: true };
  return {
    canBold: hasFace(
      font,
      text.fontWeight === "bold" ? "normal" : "bold",
      text.fontStyle,
    ),
    canItalic: hasFace(
      font,
      text.fontWeight,
      text.fontStyle === "italic" ? "normal" : "italic",
    ),
  };
}

/** A style change with the face snapped to one the font really has. */
export function withRealFace(
  text: TextStyle,
  change: Partial<TextStyle>,
): TextStyle {
  const next = { ...text, ...change };
  const font = fontForFamily(next.fontFamily);
  if (!font) return next;
  const face = fitFace(font, next.fontWeight, next.fontStyle);
  return { ...next, fontWeight: face.weight, fontStyle: face.style };
}

/** The fields of `next` that differ from `prev` (what Done applies). */
export function textStyleChanges(
  prev: TextStyle,
  next: TextStyle,
): Partial<TextStyle> {
  const out: Partial<TextStyle> = {};
  for (const key of Object.keys(next) as (keyof TextStyle)[])
    if (next[key] !== prev[key]) Object.assign(out, { [key]: next[key] });
  return out;
}
