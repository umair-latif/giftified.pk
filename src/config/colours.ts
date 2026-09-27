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
