import type { PkMobile } from "@/types/order";

/**
 * Normalises a Pakistani MOBILE number to E.164 (`+923001234567`).
 * Accepts the ways people actually type it: `03001234567`, `3001234567`,
 * `+92 300 1234567`, `0092-300-1234567`, `92 300 1234567`, `+92 (0)300…`.
 * Rejects landlines (e.g. 042-35761234), wrong lengths and anything with letters.
 * Pure — safe on client and server.
 */
export function normalizePkMobile(input: string): PkMobile | null {
  const raw = input.trim();
  // Only digits and common separators; a single leading "+".
  if (!/^\+?[\d\s\-.()]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("0092")) national = digits.slice(4);
  else if (digits.startsWith("92") && digits.length >= 12)
    national = digits.slice(2);
  else if (raw.startsWith("+"))
    return null; // another country code
  else national = digits;
  // Trunk prefix: "0300…" or "+92 0300…".
  if (national.startsWith("0")) national = national.slice(1);
  return /^3\d{9}$/.test(national) ? `+92${national}` : null;
}

/**
 * `+923001234567` → `+92 300 ***4567`: enough for the customer to recognise
 * their number on a public page without exposing it to anyone with the link.
 */
export function maskPkMobile(phone: PkMobile): string {
  const n = phone.slice(3);
  return `+92 ${n.slice(0, 3)} ***${n.slice(-4)}`;
}
