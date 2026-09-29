import { SELF_HOSTED_FONTS } from "@/config/fonts";

/**
 * Loads every self-hosted text-sheet font with the FontFace API and adds it
 * to `document.fonts`. Call this when the text "More" sheet opens — never
 * eagerly — so the ~290 KB of WOFF2 files never touch the first paint.
 * Safe to call repeatedly: the result is cached (and reused) for the life of
 * the page.
 */
let loaded: Promise<void> | null = null;

export function loadTextSheetFonts(): Promise<void> {
  loaded ??= Promise.all(
    Object.entries(SELF_HOSTED_FONTS).flatMap(([id, faces]) =>
      faces.map(async (face) => {
        const font = new FontFace(
          familyFor(id),
          `url(/fonts/text-sheet/${face.file})`,
          { weight: face.weight, style: face.style },
        );
        await font.load();
        document.fonts.add(font);
      }),
    ),
  )
    .then(() => undefined)
    .catch((err: unknown) => {
      // A slow/offline connection shouldn't block editing — the sheet still
      // works, those fonts just fall back to the browser default until a
      // retry succeeds.
      console.error("[editor] failed to load text-sheet fonts", err);
      loaded = null;
    });
  return loaded;
}

/** `"playful"` -> `"Poppins"`, matching the quoted name in `FontOption.family`. */
function familyFor(id: string): string {
  const label = FAMILY_BY_ID[id];
  if (!label) throw new Error(`No self-hosted font family for "${id}"`);
  return label;
}

const FAMILY_BY_ID: Readonly<Record<string, string>> = {
  playful: "Poppins",
  elegant: "Playfair Display",
  handwritten: "Caveat",
  urdu: "Noto Nastaliq Urdu",
};
