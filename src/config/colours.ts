/**
 * Text colours offered in the editor. Chosen to print reliably on white
 * ceramic and light garments (UV / DTF). Custom colours are still allowed.
 */
export interface Swatch {
  name: string;
  hex: `#${string}`;
}

export const TEXT_SWATCHES: readonly Swatch[] = [
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#ffffff" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Red", hex: "#dc2626" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Gold", hex: "#ca8a04" },
  { name: "Green", hex: "#15803d" },
  { name: "Teal", hex: "#0f766e" },
  { name: "Blue", hex: "#1d4ed8" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Purple", hex: "#7e22ce" },
  { name: "Pink", hex: "#db2777" },
  { name: "Brown", hex: "#78350f" },
];

/**
 * Background colours (editor tool "Colour"): soft tints that keep text
 * readable, the brand brights, and a few deep shades. The whole print area is
 * filled, so these print as solid colour (full wrap on a mug).
 */
export const BACKGROUND_SWATCHES: readonly Swatch[] = [
  { name: "Cream", hex: "#fdf6e3" },
  { name: "Blush", hex: "#fce7f3" },
  { name: "Peach", hex: "#ffedd5" },
  { name: "Lemon", hex: "#fef9c3" },
  { name: "Mint", hex: "#dcfce7" },
  { name: "Sky", hex: "#e0f2fe" },
  { name: "Lavender", hex: "#ede9fe" },
  { name: "Grey", hex: "#e5e7eb" },
  { name: "Banana", hex: "#ffe135" },
  { name: "Pink", hex: "#ff3d8b" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Orange", hex: "#f97316" },
  { name: "Red", hex: "#dc2626" },
  { name: "Green", hex: "#15803d" },
  { name: "Navy", hex: "#1e3a8a" },
  { name: "Black", hex: "#111827" },
];
