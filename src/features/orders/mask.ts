import type { PkMobile } from "@/types/order";

/**
 * `+923001234567` → `0300 •••• 567`, the way people in Pakistan write their
 * number, with only the network code and the last three digits visible.
 * Used on the order status page, which anyone holding the link can open.
 * Pure — safe on client and server.
 */
export function maskMobileForDisplay(phone: PkMobile): string {
  const national = phone.slice(3); // "3001234567"
  if (!/^3\d{9}$/.test(national)) return "•••• •••";
  return `0${national.slice(0, 3)} •••• ${national.slice(-3)}`;
}
