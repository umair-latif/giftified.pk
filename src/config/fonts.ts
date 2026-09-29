/**
 * Fonts offered in the text "More" sheet (and, via `selection-bar.tsx`'s font
 * picker, the selection bar). Every font here must ALSO be registered in the
 * server print renderer (`src/server/print/server-fonts.ts`), or the print
 * will not match the preview — `tests/unit/print-fonts.test.ts` fails if one
 * isn't.
 *
 * `sans` / `serif` / `mono` use the phone's own system fonts (a CSS stack);
 * the print renderer substitutes a metric-compatible bundled font for them,
 * so line breaks usually match but glyph shapes can differ slightly —
 * closing that gap for every font is task 16 (editor ↔ print font parity).
 *
 * The other four are self-hosted WOFF2 files under `public/fonts/text-sheet/`
 * (same TTFs, registered under the same family name, back the print
 * renderer), so what the customer sees is exactly what prints. They are
 * loaded with the FontFace API only when the text sheet opens
 * (`src/features/editor/fonts/load-fonts.ts`), never on first paint.
 */
export interface FontOption {
  /** Stable key. Looked up in `SELF_HOSTED_FONTS` for fonts that need loading. */
  id: string;
  /** CSS font stack applied to the Fabric text object. */
  family: string;
  label: string;
  /** Script support, so Urdu-capable fonts can be filtered/highlighted. */
  scripts: readonly ("latin" | "arabic")[];
}

export const FONTS: readonly FontOption[] = [
  {
    id: "sans",
    family: "Arial, Helvetica, sans-serif",
    label: "Sans",
    scripts: ["latin"],
  },
  {
    id: "serif",
    family: "Georgia, 'Times New Roman', serif",
    label: "Serif",
    scripts: ["latin"],
  },
  {
    id: "mono",
    family: "'Courier New', Courier, monospace",
    label: "Mono",
    scripts: ["latin"],
  },
  {
    id: "playful",
    family: "'Poppins', Arial, sans-serif",
    label: "Playful",
    scripts: ["latin"],
  },
  {
    id: "elegant",
    family: "'Playfair Display', Georgia, serif",
    label: "Elegant",
    scripts: ["latin"],
  },
  {
    id: "handwritten",
    family: "'Caveat', cursive",
    label: "Handwritten",
    scripts: ["latin"],
  },
  {
    id: "urdu",
    family: "'Noto Nastaliq Urdu', serif",
    label: "اردو",
    scripts: ["arabic"],
  },
];

export interface SelfHostedFontFace {
  weight: "normal" | "bold";
  style: "normal" | "italic";
  /** Filename under `public/fonts/text-sheet/`. */
  file: string;
}

/**
 * Fonts that need a `FontFace` loaded before they render correctly (every
 * `FontOption` above except the three system stacks). The browser fakes a
 * missing weight/style from whichever face *is* loaded (no bold face for
 * Caveat's italic, no italic design for Caveat/Urdu at all) — the print
 * renderer's registered files do the same (see `server-fonts.ts`), so the
 * approximation matches on both sides.
 */
export const SELF_HOSTED_FONTS: Readonly<
  Record<string, readonly SelfHostedFontFace[]>
> = {
  playful: [
    { weight: "normal", style: "normal", file: "poppins-regular.woff2" },
    { weight: "bold", style: "normal", file: "poppins-bold.woff2" },
    { weight: "normal", style: "italic", file: "poppins-italic.woff2" },
  ],
  elegant: [
    { weight: "normal", style: "normal", file: "playfair-regular.woff2" },
    { weight: "bold", style: "normal", file: "playfair-bold.woff2" },
    { weight: "normal", style: "italic", file: "playfair-italic.woff2" },
  ],
  handwritten: [
    { weight: "normal", style: "normal", file: "caveat-regular.woff2" },
    { weight: "bold", style: "normal", file: "caveat-bold.woff2" },
  ],
  urdu: [
    {
      weight: "normal",
      style: "normal",
      file: "noto-nastaliq-urdu-regular.woff2",
    },
  ],
};
