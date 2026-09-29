/** The coupon code the customer applied, kept on this phone between the cart and checkout. */
const KEY = "giftified:coupon";

export function readCoupon(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeCoupon(code: string): void {
  try {
    if (code) localStorage.setItem(KEY, code);
    else localStorage.removeItem(KEY);
  } catch {
    /* not remembered: the customer types it again at checkout */
  }
}
