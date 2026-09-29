import { existsSync } from "node:fs";
import path from "node:path";

import {
  FONTS,
  fontForFamily,
  type FontId,
  type FontOption,
  type FontStyle,
  type FontWeight,
} from "@/config/fonts";

export { parseFontStack } from "@/config/fonts";

/**
 * Fonts for the server print renderer — derived from `src/config/fonts.ts`,
 * the single list shared with the browser editor (task 16). Each font's TTFs
 * live in `./fonts/<dir>/` (SIL OFL 1.1, licence next to them) and the SAME
 * files are served to the browser as WOFF2 from `public/fonts/print/<dir>/`
 * (`python3 scripts/build-fonts.py`), registered under the same unique family
 * name on both sides, so the print lays text out exactly like the editor.
 *
 * Only real faces are registered — never an upright copy in an italic/bold
 * slot. Designs are normalised first (`features/editor/fonts/migrate.ts`)
 * so a style a font doesn't have (Caveat italic, Urdu bold) is dropped,
 * exactly as the editor does.
 */
export interface ServerFontFace {
  file: string;
  weight: FontWeight;
  style: FontStyle;
}

export interface ServerFont {
  /** Unique family name registered with node-canvas (never a system font name). */
  family: string;
  /** Folder under `./fonts`. */
  dir: string;
  faces: readonly ServerFontFace[];
}

function toServerFont(font: FontOption): ServerFont {
  return {
    family: font.name,
    dir: font.dir,
    faces: font.faces.map((f) => ({ ...f, file: `${f.file}.ttf` })),
  };
}

/** Server fonts keyed by `FontOption.id` (`sans`, `serif`, …, `urdu`). */
export const SERVER_FONTS = Object.fromEntries(
  FONTS.map((f) => [f.id, toServerFont(f)]),
) as Readonly<Record<FontId, ServerFont>>;

/**
 * The server font for a CSS font stack: current family names and the old
 * pre-task-16 device stacks (`Arial, …` → Sans) — or null if unknown.
 */
export function serverFontFor(stack: string): ServerFont | null {
  const font = fontForFamily(stack);
  return font ? SERVER_FONTS[font.id] : null;
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
