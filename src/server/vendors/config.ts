import type { ProductId } from "@/config/products";

/**
 * Print partners. Which vendor prints which product is fixed here; their
 * contacts come from env (Vercel settings), so they stay out of the repo and
 * change without a code edit:
 *
 *   VENDOR_MUGS_NAME / VENDOR_MUGS_EMAIL / VENDOR_MUGS_WHATSAPP
 *   VENDOR_APPAREL_NAME / VENDOR_APPAREL_EMAIL / VENDOR_APPAREL_WHATSAPP
 *   VENDOR_HANDOFF_TO   the admin address that gets "Send to vendor" emails
 *
 * Any contact may be missing: without an email the send page says so; without
 * a WhatsApp number the WhatsApp button lets the founder pick the contact.
 */
export interface VendorGroup {
  id: "mugs" | "apparel";
  /** Shown when no name is configured. */
  label: string;
  productIds: readonly ProductId[];
}

export const VENDOR_GROUPS: readonly VendorGroup[] = [
  { id: "mugs", label: "Mug printer", productIds: ["mug"] },
  { id: "apparel", label: "Apparel printer", productIds: ["tshirt", "hoodie"] },
];

export interface Vendor {
  id: VendorGroup["id"];
  name: string;
  email?: string;
  /** Digits only, with country code (e.g. 923001234567), for wa.me links. */
  whatsapp?: string;
  productIds: readonly ProductId[];
}

type Env = Record<string, string | undefined>;

const clean = (v: string | undefined) => v?.trim() || undefined;

/** "+92 300 1234567" / "0300-1234567" → "923001234567"; undefined if not a number. */
export function waDigits(raw: string | undefined): string | undefined {
  const v = clean(raw);
  if (!v) return undefined;
  let d = v.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `92${d.slice(1)}`; // Pakistani local format
  return /^\d{8,15}$/.test(d) ? d : undefined;
}

export function vendorsFromEnv(env: Env = process.env): Vendor[] {
  return VENDOR_GROUPS.map((g) => {
    const key = g.id.toUpperCase();
    const email = clean(env[`VENDOR_${key}_EMAIL`]);
    const whatsapp = waDigits(env[`VENDOR_${key}_WHATSAPP`]);
    return {
      id: g.id,
      name: clean(env[`VENDOR_${key}_NAME`]) ?? g.label,
      productIds: g.productIds,
      ...(email ? { email } : {}),
      ...(whatsapp ? { whatsapp } : {}),
    };
  });
}

/** Who gets the "Send to vendor" email (the admin). */
export function handoffRecipient(env: Env = process.env): string | undefined {
  return clean(env.VENDOR_HANDOFF_TO);
}
