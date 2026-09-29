/**
 * Colours for the occasion tiles (docs/brand.md: magenta and sunny, both pass AA
 * with their text colour). Laid out like a chess board — for the 2-column phone grid
 * and, separately, for the 4-column grid from `sm` — so neighbours never match and a
 * column is never a single colour.
 */
const MAGENTA = ["bg-magenta", "text-white"] as const;
const SUNNY = ["bg-sunny", "text-ink"] as const;

export function tileIsMagenta(index: number, columns: number): boolean {
  return (((index % columns) + Math.floor(index / columns)) & 1) === 0;
}

export function tileClass(index: number): string {
  const phone = tileIsMagenta(index, 2) ? MAGENTA : SUNNY;
  // Static strings so Tailwind sees every class.
  const wide = tileIsMagenta(index, 4)
    ? "sm:bg-magenta sm:text-white"
    : "sm:bg-sunny sm:text-ink";
  return `${phone.join(" ")} ${wide}`;
}
