import {
  DEFAULT_TEXT_FONT,
  FONTS,
  fitFace,
  type FontFaceFile,
  type FontOption,
  type FontStyle,
  type FontWeight,
} from "@/config/fonts";
import type { FaceRef } from "./migrate";

/**
 * Browser loader for the print fonts (`public/fonts/print/`, the same files
 * the server prints with — see `src/config/fonts.ts`). Fonts are added to
 * `document.fonts` with the FontFace API, one file per face, and only when
 * the editor or preview needs them: never import this from shop pages.
 *
 * - `loadFaces(faces)`: what a design uses — awaited before its first render
 *   (resolves `false` after `timeoutMs` or on failure; never rejects, so an
 *   offline phone still renders with a fallback font).
 * - `onFontLoaded(cb)`: fires whenever a face finishes, including late ones,
 *   so canvases can re-measure their text.
 * - `loadPickerFonts()`: one face per font, for the font picker / text sheet.
 */
const loading = new Map<string, Promise<boolean>>();
const listeners = new Set<() => void>();

export const fontUrl = (font: FontOption, face: FontFaceFile) =>
  `/fonts/print/${font.dir}/${face.file}.woff2`;

function loadFile(font: FontOption, face: FontFaceFile): Promise<boolean> {
  const url = fontUrl(font, face);
  let p = loading.get(url);
  if (!p) {
    p = (async () => {
      try {
        const ff = new FontFace(font.name, `url(${url})`, {
          weight: face.weight,
          style: face.style,
        });
        await ff.load();
        document.fonts.add(ff);
        listeners.forEach((cb) => cb());
        return true;
      } catch (err) {
        console.warn(`[fonts] ${url} failed to load`, err);
        loading.delete(url); // allow a retry later (e.g. back online)
        return false;
      }
    })();
    loading.set(url, p);
  }
  return p;
}

function filesFor(refs: readonly FaceRef[]) {
  return refs.flatMap(({ font, weight, style }) =>
    font.faces
      .filter((f) => f.weight === weight && f.style === style)
      .map((face) => [font, face] as const),
  );
}

/** Resolves true once every face has loaded, false if any failed. No timeout. */
export async function whenFacesLoaded(
  refs: readonly FaceRef[],
): Promise<boolean> {
  if (typeof FontFace === "undefined") return false;
  const results = await Promise.all(
    filesFor(refs).map(([font, face]) => loadFile(font, face)),
  );
  return results.every(Boolean);
}

/**
 * Starts loading `refs` and resolves when they are ready — or `false` after
 * `timeoutMs` / on failure (loading continues; `onFontLoaded` reports it).
 */
export function loadFaces(
  refs: readonly FaceRef[],
  timeoutMs = 4000,
): Promise<boolean> {
  return Promise.race([
    whenFacesLoaded(refs),
    new Promise<boolean>((r) => setTimeout(() => r(false), timeoutMs)),
  ]);
}

/** The face every new text starts with (Sans bold, see `engine/text.ts`). */
export const DEFAULT_TEXT_FACE: FaceRef = {
  font: DEFAULT_TEXT_FONT,
  weight: "bold",
  style: "normal",
};

/**
 * For the font picker / text sheet: each font in the face the selected text
 * would get if switched to it, so switching is instant (≈225 KB for all seven
 * in bold). Other faces load when a toggle asks for them.
 */
export function loadPickerFonts(
  weight: FontWeight,
  style: FontStyle,
): Promise<boolean> {
  return whenFacesLoaded(
    FONTS.map((font) => ({ font, ...fitFace(font, weight, style) })),
  );
}

/** Subscribe to "a font face finished loading". Returns an unsubscribe function. */
export function onFontLoaded(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
