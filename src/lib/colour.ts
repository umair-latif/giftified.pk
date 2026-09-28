/**
 * Parses what a customer types into the colour code field.
 * Accepts "1D4ED8", "#1d4ed8", "#abc" / "abc" (short form) with spaces around.
 * Returns lowercase "#rrggbb", or null if it isn't a valid colour code.
 */
export function parseHexColour(input: string): `#${string}` | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toLowerCase()}`;
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    const [r, g, b] = raw.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

/** "#1d4ed8" → "1D4ED8" for display next to a fixed "#". */
export function hexDigits(hex: string): string {
  return hex.replace(/^#/, "").toUpperCase();
}
