import localFont from "next/font/local";

/**
 * Brand fonts (self-hosted, OFL): Space Grotesk for text, Bagel Fat One for
 * the logo and headings. Latin subset only, ~64 KB total. See docs/brand.md.
 * These are site fonts only; the editor/print fonts are `src/config/fonts.ts`.
 */
export const spaceGrotesk = localFont({
  src: [
    { path: "./fonts/space-grotesk-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/space-grotesk-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/space-grotesk-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "Roboto", "Arial", "sans-serif"],
});

/** One weight only (400): headings must not ask for bold, or browsers fake it. */
export const bagelFatOne = localFont({
  src: [
    { path: "./fonts/bagel-fat-one-latin-400-normal.woff2", weight: "400" },
  ],
  variable: "--font-bagel",
  display: "swap",
  fallback: ["system-ui", "Roboto", "Arial", "sans-serif"],
});
