import localFont from "next/font/local";

/**
 * Brand fonts (self-hosted, OFL): Poppins for text, Nunito ExtraBold for
 * headings — a free stand-in for the brand sheet's Halyard Rounded
 * (commercial). Latin subset only, ~40 KB total. See docs/brand.md.
 */
export const poppins = localFont({
  src: [
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["system-ui", "Roboto", "Arial", "sans-serif"],
});

export const nunito = localFont({
  src: [{ path: "./fonts/nunito-latin-800-normal.woff2", weight: "800" }],
  variable: "--font-nunito",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "Roboto", "Arial", "sans-serif"],
});
