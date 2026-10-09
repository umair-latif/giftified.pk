/**
 * What the customer has typed at checkout, kept for this tab (sessionStorage)
 * so "Edit cart" → back, or a reload, doesn't wipe the form. Cleared when the
 * order is placed; the browser drops it when the tab is closed. Never the
 * confirmation or marketing ticks: those are asked fresh every time.
 */
const KEY = "giftified:checkout-draft";

export interface CheckoutDraft {
  values: Record<string, string>;
  deliveryDifferent: boolean;
}

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const { values, deliveryDifferent } = data as Record<string, unknown>;
    if (!values || typeof values !== "object") return null;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(values))
      if (typeof v === "string" && v.length <= 500) clean[k] = v;
    return { values: clean, deliveryDifferent: deliveryDifferent === true };
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* storage blocked or full: the form still works, it just isn't kept */
  }
}

export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* blocked */
  }
}
