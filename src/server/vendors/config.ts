import type { ProductId } from "@/config/products";
import type { CatalogProduct } from "@/lib/commerce/types";

/**
 * Print partners come from WP admin (founder, 11 Oct): each base product
 * (Custom Mug, Custom T-shirt, Custom Hoodie) has custom fields
 * `vendor_name`, `vendor_email`, `vendor_whatsapp`. Products with the same
 * vendor (same email, else number, else name) are grouped, so a T-shirt and
 * a hoodie for one apparel printer go in one message. Designs made from a
 * product use that product's vendor. Any field may be missing: without an
 * email the send page says so; without a number WhatsApp lets you pick the
 * contact. A product without any vendor fields is its own "vendor not set".
 */
export interface Vendor {
  /** Stable within an order: the first product this vendor prints. */
  id: ProductId;
  name: string;
  email?: string;
  /** Digits only, with country code (e.g. 923001234567), for wa.me links. */
  whatsapp?: string;
  productIds: ProductId[];
}

/** "+92 300 1234567" / "0300-1234567" → "923001234567"; undefined if not a number. */
export function waDigits(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  let d = v.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `92${d.slice(1)}`; // Pakistani local format
  return /^\d{8,15}$/.test(d) ? d : undefined;
}

export function vendorsFromCatalog(catalog: CatalogProduct[]): Vendor[] {
  const vendors: Vendor[] = [];
  const byKey = new Map<string, Vendor>();
  for (const p of catalog) {
    const email = p.vendor?.email?.trim().toLowerCase() || undefined;
    const whatsapp = waDigits(p.vendor?.whatsapp);
    const name = p.vendor?.name?.trim() || undefined;
    const key = email
      ? `e:${email}`
      : whatsapp
        ? `w:${whatsapp}`
        : name
          ? `n:${name.toLowerCase()}`
          : `p:${p.productId}`;
    const known = byKey.get(key);
    if (known) {
      known.productIds.push(p.productId);
      continue;
    }
    const v: Vendor = {
      id: p.productId,
      name: name ?? `${p.name} printer (not set)`,
      productIds: [p.productId],
      ...(email ? { email } : {}),
      ...(whatsapp ? { whatsapp } : {}),
    };
    byKey.set(key, v);
    vendors.push(v);
  }
  return vendors;
}
