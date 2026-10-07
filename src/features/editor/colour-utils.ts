/** True for a dark garment colour (hex), where default text should be white. */
export function isDarkHex(hex: string): boolean {
  const n = parseInt(hex.replace("#", ""), 16);
  const lum =
    0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum < 110;
}
