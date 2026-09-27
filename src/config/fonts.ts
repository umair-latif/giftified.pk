/**
 * Fonts offered in the text sheet. Every font here must ALSO be registered in
 * the server print renderer, or the print will not match the preview.
 * The text-styling task replaces these with self-hosted, subset font files.
 */
export interface FontOption {
  family: string;
  label: string;
  /** Script support, so Urdu fonts can be filtered. */
  scripts: readonly ("latin" | "arabic")[];
}

export const FONTS: readonly FontOption[] = [
  { family: "Arial, Helvetica, sans-serif", label: "Sans", scripts: ["latin"] },
  {
    family: "Georgia, 'Times New Roman', serif",
    label: "Serif",
    scripts: ["latin"],
  },
  {
    family: "'Courier New', Courier, monospace",
    label: "Mono",
    scripts: ["latin"],
  },
];
