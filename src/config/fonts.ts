/**
 * Fonts offered in the editor (selection-bar picker + text "More" sheet) and
 * the SINGLE source of truth for the print renderer's fonts (task 16).
 *
 * Every font is one set of open-licence files (SIL OFL 1.1, licence next to
 * the files) used on both sides, so what the customer sees is what prints:
 *
 * - server: TTFs in `src/server/print/fonts/<dir>/`, registered with
 *   node-canvas under `name` (`src/server/print/server-fonts.ts`);
 * - browser: the SAME TTFs as WOFF2 (container change only, identical glyphs
 *   and metrics) in `public/fonts/print/<dir>/`, loaded with the FontFace API
 *   under the same `name`, only when the editor/preview needs them
 *   (`src/features/editor/fonts/load-fonts.ts`). Never on shop pages.
 *
 * `name` is unique ("Giftified …") so a phone's own Arial/Poppins can never
 * stand in for our file. Rebuild the WOFF2 copies after changing a TTF:
 * `python3 scripts/build-fonts.py`.
 *
 * `faces` lists only REAL designs. A weight/style without a face (Caveat
 * italic, Urdu bold/italic) is not offered: the selection bar disables the
 * toggle and `fitFace` strips it, because the browser would fake it (faux
 * bold/oblique) while the print would not.
 */
export type FontWeight = "normal" | "bold";
export type FontStyle = "normal" | "italic";

export interface FontFaceFile {
  weight: FontWeight;
  style: FontStyle;
  /** Basename without extension: `<file>.ttf` on the server, `<file>.woff2` in the browser. */
  file: string;
}

export type FontId =
  | "sans"
  | "serif"
  | "mono"
  | "playful"
  | "elegant"
  | "handwritten"
  | "signature"
  | "brush"
  | "urdu"
  | "urdu-naskh"
  | "urdu-kufi";

export interface FontOption {
  /** Stable key. */
  id: FontId;
  /** Unique family name registered in the browser AND on the server. */
  name: string;
  /** CSS font stack stored on Fabric text objects (`fontFamily`). */
  family: string;
  label: string;
  /** Script support, so Urdu-capable fonts can be filtered/highlighted. */
  scripts: readonly ("latin" | "arabic")[];
  /** Folder under `src/server/print/fonts/` and `public/fonts/print/`. */
  dir: string;
  faces: readonly FontFaceFile[];
  /**
   * Old `fontFamily` stacks / family names (lower-case) that mean this font —
   * designs saved before task 16 used device-font stacks. See
   * `src/features/editor/fonts/migrate.ts`.
   */
  aliases: readonly string[];
}

const fourFaces = (prefix: string): FontFaceFile[] => [
  { weight: "normal", style: "normal", file: `${prefix}-Regular` },
  { weight: "bold", style: "normal", file: `${prefix}-Bold` },
  { weight: "normal", style: "italic", file: `${prefix}-Italic` },
  { weight: "bold", style: "italic", file: `${prefix}-BoldItalic` },
];

export const FONTS: readonly FontOption[] = [
  {
    id: "sans",
    name: "Giftified Sans", // Liberation Sans 2.1.5 (Arial metrics)
    family: "'Giftified Sans', sans-serif",
    label: "Sans",
    scripts: ["latin"],
    dir: "liberation",
    faces: fourFaces("LiberationSans"),
    aliases: ["arial", "helvetica", "arimo", "liberation sans", "sans-serif"],
  },
  {
    id: "serif",
    name: "Giftified Serif", // Gelasio 1.008 (Georgia metrics)
    family: "'Giftified Serif', serif",
    label: "Serif",
    scripts: ["latin"],
    dir: "gelasio",
    faces: fourFaces("Gelasio"),
    aliases: ["georgia", "gelasio", "times new roman", "times", "serif"],
  },
  {
    id: "mono",
    name: "Giftified Mono", // Liberation Mono 2.1.5 (Courier New metrics)
    family: "'Giftified Mono', monospace",
    label: "Mono",
    scripts: ["latin"],
    dir: "liberation",
    faces: fourFaces("LiberationMono"),
    aliases: [
      "courier new",
      "courier",
      "cousine",
      "liberation mono",
      "monospace",
    ],
  },
  {
    id: "playful",
    name: "Giftified Poppins",
    family: "'Giftified Poppins', sans-serif",
    label: "Playful",
    scripts: ["latin"],
    dir: "poppins",
    faces: fourFaces("Poppins"),
    aliases: ["poppins"],
  },
  {
    id: "elegant",
    name: "Giftified Playfair",
    family: "'Giftified Playfair', serif",
    label: "Elegant",
    scripts: ["latin"],
    dir: "playfair-display",
    faces: fourFaces("PlayfairDisplay"),
    aliases: ["playfair display"],
  },
  {
    id: "handwritten",
    name: "Giftified Caveat",
    family: "'Giftified Caveat', cursive",
    label: "Handwritten",
    scripts: ["latin"],
    dir: "caveat",
    // Caveat has no italic design.
    faces: [
      { weight: "normal", style: "normal", file: "Caveat-Regular" },
      { weight: "bold", style: "normal", file: "Caveat-Bold" },
    ],
    aliases: ["caveat", "cursive"],
  },
  {
    id: "signature",
    name: "Giftified Great Vibes",
    family: "'Giftified Great Vibes', cursive",
    label: "Signature",
    scripts: ["latin"],
    dir: "great-vibes",
    // Great Vibes (OFL, google/fonts), Latin subset. One design only: a script
    // this thin has no bold or italic.
    faces: [{ weight: "normal", style: "normal", file: "GreatVibes-Regular" }],
    aliases: ["great vibes"],
  },
  {
    id: "brush",
    name: "Giftified Kaushan",
    family: "'Giftified Kaushan', cursive",
    label: "Brush",
    scripts: ["latin"],
    dir: "kaushan-script",
    // Kaushan Script (OFL, google/fonts), Latin subset. Regular only.
    faces: [
      { weight: "normal", style: "normal", file: "KaushanScript-Regular" },
    ],
    aliases: ["kaushan script"],
  },
  {
    id: "urdu",
    name: "Giftified Nastaliq",
    family: "'Giftified Nastaliq', serif",
    label: "اردو",
    scripts: ["arabic"],
    dir: "noto-nastaliq-urdu",
    // Regular only: Nastaliq has no italic, and we ship no bold (download size).
    faces: [
      { weight: "normal", style: "normal", file: "NotoNastaliqUrdu-Regular" },
    ],
    aliases: ["noto nastaliq urdu"],
  },
  {
    id: "urdu-naskh",
    name: "Giftified Naskh",
    family: "'Giftified Naskh', serif",
    label: "نسخ",
    scripts: ["arabic", "latin"],
    dir: "noto-naskh-arabic",
    // Noto Naskh Arabic (OFL), static 400/700 cut from the variable font and
    // subset to the Arabic block + Latin, so mixed Urdu/English text never
    // falls back to another font. No italic design.
    faces: [
      { weight: "normal", style: "normal", file: "NotoNaskhArabic-Regular" },
      { weight: "bold", style: "normal", file: "NotoNaskhArabic-Bold" },
    ],
    aliases: ["noto naskh arabic", "noto naskh"],
  },
  {
    id: "urdu-kufi",
    name: "Giftified Kufi",
    family: "'Giftified Kufi', sans-serif",
    label: "کوفی",
    scripts: ["arabic", "latin"],
    dir: "noto-kufi-arabic",
    // Noto Kufi Arabic (OFL), same treatment as Naskh. No italic design.
    faces: [
      { weight: "normal", style: "normal", file: "NotoKufiArabic-Regular" },
      { weight: "bold", style: "normal", file: "NotoKufiArabic-Bold" },
    ],
    aliases: ["noto kufi arabic", "noto kufi"],
  },
];

/** Default for new text (`engine/text.ts`): Sans, bold. */
export const DEFAULT_TEXT_FONT: FontOption = FONTS[0]!;

/** `"Georgia, 'Times New Roman', serif"` → `["georgia", "times new roman", "serif"]`. */
export function parseFontStack(stack: string): string[] {
  return stack
    .split(",")
    .map((f) =>
      f
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
}

const BY_NAME = new Map<string, FontOption>();
for (const f of FONTS) {
  BY_NAME.set(f.name.toLowerCase(), f);
  for (const a of f.aliases) BY_NAME.set(a, f);
}
// Pre-task-16 server names (designs never stored these, but be tolerant).
for (const [old, id] of [
  ["giftified print sans", "sans"],
  ["giftified print serif", "serif"],
  ["giftified print mono", "mono"],
  ["giftified print poppins", "playful"],
  ["giftified print playfair", "elegant"],
  ["giftified print caveat", "handwritten"],
  ["giftified print nastaliq urdu", "urdu"],
] as const) {
  BY_NAME.set(
    old,
    FONTS.find((f) => f.id === id)!,
  );
}

/**
 * The font a `fontFamily` stack means: exact match first, else the first
 * family in the stack we know (current name or legacy alias), else null.
 */
export function fontForFamily(stack: string): FontOption | null {
  const exact = FONTS.find((f) => f.family === stack);
  if (exact) return exact;
  for (const name of parseFontStack(stack)) {
    const font = BY_NAME.get(name);
    if (font) return font;
  }
  return null;
}

export function hasFace(
  font: FontOption,
  weight: FontWeight,
  style: FontStyle,
): boolean {
  return font.faces.some((f) => f.weight === weight && f.style === style);
}

/**
 * The closest REAL face of `font` for a requested weight/style: drops italic
 * first, then bold. Used when switching fonts and when loading old designs.
 */
export function fitFace(
  font: FontOption,
  weight: FontWeight,
  style: FontStyle,
): { weight: FontWeight; style: FontStyle } {
  const tries: [FontWeight, FontStyle][] = [
    [weight, style],
    [weight, "normal"],
    ["normal", style],
    ["normal", "normal"],
  ];
  for (const [w, s] of tries) {
    if (hasFace(font, w, s)) return { weight: w, style: s };
  }
  const first = font.faces[0]!;
  return { weight: first.weight, style: first.style };
}

/** Fabric's `fontWeight` (string or number) → the two weights we ship. */
export function normaliseWeight(w: unknown): FontWeight {
  return w === "bold" || Number(w) >= 600 ? "bold" : "normal";
}
