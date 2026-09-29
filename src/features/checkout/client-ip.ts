import { isIp } from "@/lib/commerce/woo-map";

/** Minimal header reader: Web `Headers` and Next's `headers()` both fit. */
interface HeaderReader {
  get(name: string): string | null;
}

/** "1.2.3.4:5678" → "1.2.3.4", "[::1]:443" → "::1"; anything else unchanged. */
function stripPort(v: string): string {
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/.exec(v);
  if (v4) return v4[1]!;
  const v6 = /^\[([0-9a-f:]+)\](?::\d{1,5})?$/i.exec(v);
  return v6 ? v6[1]! : v;
}

/**
 * The customer's IP for the order (`CreateOrderInput.customerIp`): the first
 * `x-forwarded-for` hop, else `x-real-ip`. Junk (names, "unknown", empty) is
 * ignored, so only a real IPv4/IPv6 literal is ever returned.
 * The hosting proxy (Vercel) overwrites these headers; on a host that passes a
 * client-supplied X-Forwarded-For through, this is spoofable — it is a record,
 * not an access control.
 */
export function clientIpFromHeaders(h: HeaderReader): string | undefined {
  const candidates = [
    h.get("x-forwarded-for")?.split(",")[0],
    h.get("x-real-ip"),
  ];
  for (const raw of candidates) {
    const ip = raw ? stripPort(raw.trim()) : "";
    if (ip && isIp(ip)) return ip;
  }
  return undefined;
}
