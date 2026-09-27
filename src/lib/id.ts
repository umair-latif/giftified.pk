/**
 * Random UUID v4 that also works on plain-HTTP pages.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost), so it
 * is missing when a phone opens the dev server by LAN IP (http://192.168.x.x:3000).
 * `crypto.getRandomValues()` is available everywhere, so we build the UUID from it.
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
