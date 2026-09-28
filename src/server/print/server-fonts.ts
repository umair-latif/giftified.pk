import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Fonts for the server print renderer. The editor stores CSS font stacks
 * (`src/config/fonts.ts`); servers have none of those fonts, so each stack is
 * mapped to an open-licence font bundled in `./fonts` (SIL OFL 1.1, licence
 * files next to the fonts):
 *
 * - Liberation Sans 2.1.5  — metric-compatible with Arial / Helvetica
 * - Gelasio 1.008 (Latin)  — metric-compatible with Georgia
 * - Liberation Mono 2.1.5  — metric-compatible with Courier New
 *
 * Gelasio TTFs are the Latin subset from @fontsource/gelasio 5.3.0, unwrapped
 * from WOFF (container change only, glyph tables untouched).
 *
 * Metric compatibility keeps line breaks and text widths the same as a
 * browser that has the Microsoft fonts. Phones usually don't (Android falls
 * back to Roboto etc.), so the long-term fix is to self-host the SAME font
 * files in the browser and here (task 06). To add a font: drop its TTFs in
 * `./fonts/<dir>/`, add an entry to SERVER_FONTS and its CSS names to
 * FAMILY_ALIASES. `tests/unit/print-fonts.test.ts` fails if any FONTS entry
 * has no server font.
 */
export interface ServerFontFace {
  file: string;
  weight: "normal" | "bold";
  style: "normal" | "italic";
}

export interface ServerFont {
  /** Unique family name registered with node-canvas (never a system font name). */
  family: string;
  /** Folder under `./fonts`. */
  dir: string;
  faces: readonly ServerFontFace[];
}

const faces = (prefix: string): ServerFontFace[] => [
  { file: `${prefix}-Regular.ttf`, weight: "normal", style: "normal" },
  { file: `${prefix}-Bold.ttf`, weight: "bold", style: "normal" },
  { file: `${prefix}-Italic.ttf`, weight: "normal", style: "italic" },
  { file: `${prefix}-BoldItalic.ttf`, weight: "bold", style: "italic" },
];

export const SERVER_FONTS = {
  sans: {
    family: "Giftified Print Sans",
    dir: "liberation",
    faces: faces("LiberationSans"),
  },
  serif: {
    family: "Giftified Print Serif",
    dir: "gelasio",
    faces: faces("Gelasio"),
  },
  mono: {
    family: "Giftified Print Mono",
    dir: "liberation",
    faces: faces("LiberationMono"),
  },
} as const satisfies Record<string, ServerFont>;

export type ServerFontKey = keyof typeof SERVER_FONTS;

/** Lower-case CSS family names (as they appear in font stacks) → server font. */
export const FAMILY_ALIASES: Readonly<Record<string, ServerFontKey>> = {
  arial: "sans",
  helvetica: "sans",
  arimo: "sans",
  "liberation sans": "sans",
  "sans-serif": "sans",
  georgia: "serif",
  gelasio: "serif",
  "times new roman": "serif",
  times: "serif",
  serif: "serif",
  "courier new": "mono",
  courier: "mono",
  cousine: "mono",
  "liberation mono": "mono",
  monospace: "mono",
};

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

/** The server font for a CSS font stack: the first family in it we know, or null. */
export function serverFontFor(stack: string): ServerFont | null {
  for (const name of parseFontStack(stack)) {
    const key = FAMILY_ALIASES[name];
    if (key) return SERVER_FONTS[key];
  }
  return null;
}

/**
 * Folder with the bundled fonts. Resolved from the project root (the working
 * directory for `next start`, Vercel functions, Vitest and scripts); override
 * with `PRINT_FONTS_DIR`. Deploys must include `src/server/print/fonts/**`
 * in the function bundle (next.config `outputFileTracingIncludes`).
 */
export function fontsDir(): string {
  return (
    process.env.PRINT_FONTS_DIR ??
    path.join(process.cwd(), "src", "server", "print", "fonts")
  );
}

/** Absolute paths of every face, for registration (and tests). */
export function serverFontFiles(dir = fontsDir()) {
  return Object.values(SERVER_FONTS).flatMap((font) =>
    font.faces.map((face) => ({
      ...face,
      family: font.family,
      path: path.join(dir, font.dir, face.file),
    })),
  );
}

let registered = false;

/**
 * Registers the bundled fonts with node-canvas (once per process). Must run
 * before the first canvas is created.
 */
export async function registerServerFonts(): Promise<void> {
  if (registered) return;
  const { registerFont } = await import("canvas");
  for (const f of serverFontFiles()) {
    if (!existsSync(f.path)) {
      throw new Error(
        `Print font file missing: ${f.path} (set PRINT_FONTS_DIR or include src/server/print/fonts in the deploy)`,
      );
    }
    registerFont(f.path, {
      family: f.family,
      weight: f.weight,
      style: f.style,
    });
  }
  registered = true;
}
