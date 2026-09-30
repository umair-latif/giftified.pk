import { addLine, CartFullError } from "@/features/cart/cart-lines";
import { readCart, writeCart } from "@/features/cart/cart-storage";
import { saveDraft, saveThumbnail } from "@/features/editor/draft";
import { downloadPhotos } from "@/features/saved-designs/open-saved-design";
import { newId } from "@/lib/id";
import { MAX_CART_LINES, type CartItem } from "@/types/cart";
import { isDesignDocument } from "@/types/design";
import type { OrderLineInput } from "@/types/order";

export class OrderAgainFailed extends Error {}

type Line = Pick<
  OrderLineInput,
  "productId" | "colourId" | "size" | "quantity" | "designId" | "templateId"
>;

/**
 * "Order again" (task 21): copies an order's designs back into the cart on
 * this device — same product, colour, size and quantity; lines that shared a
 * design share it again. The customer can still edit each line before
 * checkout, which uploads and re-checks everything as usual.
 */
export async function orderAgain(
  orderId: number,
  lines: Line[],
  doFetch: typeof fetch = (i, init) => fetch(i, init),
): Promise<number> {
  const cart = readCart();
  // Check room first so nothing is downloaded for a cart that can't take it.
  if (cart.length + lines.length > MAX_CART_LINES) throw new CartFullError();
  const designKeys = new Map<string, string>();
  for (const designId of new Set(lines.map((l) => l.designId))) {
    const res = await doFetch(
      `/api/account/orders/${orderId}/designs/${encodeURIComponent(designId)}`,
    );
    const data = (await res.json().catch(() => ({}))) as {
      design?: unknown;
      assetUrls?: Record<string, string>;
      thumbnailUrl?: string;
      error?: string;
    };
    if (!res.ok || !isDesignDocument(data.design) || !data.assetUrls)
      throw new OrderAgainFailed(
        data.error ?? "We couldn't load this order's design.",
      );
    await downloadPhotos(data.design, data.assetUrls, doFetch);
    const key = newId();
    if (!saveDraft(data.design, key))
      throw new OrderAgainFailed(
        "Your phone's storage is full, so the design couldn't be added.",
      );
    if (data.thumbnailUrl) {
      const thumb = await dataUrl(doFetch, data.thumbnailUrl);
      if (thumb) saveThumbnail(key, thumb);
    }
    designKeys.set(designId, key);
  }
  let next = cart;
  const now = new Date().toISOString();
  for (const l of lines) {
    const item: CartItem = {
      id: newId(),
      productId: l.productId,
      colourId: l.colourId,
      ...(l.size ? { size: l.size } : {}),
      quantity: l.quantity,
      designKey: designKeys.get(l.designId)!,
      ...(l.templateId ? { templateId: l.templateId } : {}),
      addedAt: now,
    };
    next = addLine(next, item); // throws CartFullError before anything is written
  }
  writeCart(next);
  return lines.length;
}

async function dataUrl(doFetch: typeof fetch, url: string) {
  try {
    const r = await doFetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
