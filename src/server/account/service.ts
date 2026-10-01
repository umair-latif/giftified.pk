import { collectAssetIds } from "@/features/editor/assets/asset-ref";
import type { CommerceClient } from "@/lib/commerce/types";
import {
  assetKey,
  designFolder,
  designKey,
  designThumbKey,
} from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import {
  deleteAllSavedDesigns,
  type SavedDesignDeps,
} from "@/server/saved-designs/service";
import { isDesignDocument, type DesignDocument } from "@/types/design";
import type { Order, OrderId } from "@/types/order";

/**
 * Task 21 — account area logic with injected deps (Server Actions, route
 * handlers and tests call the same code).
 */
export interface AccountDeps extends SavedDesignDeps {
  commerce: SavedDesignDeps["commerce"] &
    Pick<CommerceClient, "listCustomerOrders" | "deleteCustomer">;
  storage: SavedDesignDeps["storage"] &
    Pick<ObjectStorage, "presignGet" | "deletePrefix">;
}

export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

const OPEN = new Set(["on-hold", "processing"]);
const MAX_ORDER_PAGES = 50;

/** Every order of the account (all pages, newest first). */
export async function allCustomerOrders(
  customerId: number,
  deps: Pick<AccountDeps, "commerce">,
): Promise<Order[]> {
  const out: Order[] = [];
  for (let page = 1; page <= MAX_ORDER_PAGES; page++) {
    const r = await deps.commerce.listCustomerOrders(customerId, page);
    out.push(...r.orders);
    if (page >= r.totalPages || r.orders.length === 0) break;
  }
  return out;
}

export const OPEN_ORDERS_MESSAGE =
  "You have an order we're still working on. You can delete your account once it has been delivered or cancelled.";

/**
 * Deletes the account. Refused while an order is open (its design is needed
 * to print and we must be able to reach the customer). Otherwise:
 *  1. every saved design and its photos (accounts/<id>/ and order designs);
 *  2. the designs of all the account's orders (they are closed);
 *  3. the WooCommerce customer. Order records stay in WooCommerce for the
 *     3-year accounting period (privacy notice); print files follow the
 *     normal 30-day retention.
 * Storage first: if a later step fails the customer can simply try again.
 */
export async function deleteAccount(
  customerId: number,
  deps: AccountDeps,
): Promise<{ designsDeleted: number }> {
  const orders = await allCustomerOrders(customerId, deps);
  if (orders.some((o) => OPEN.has(o.status)))
    throw new AccountError(OPEN_ORDERS_MESSAGE, 409);
  const { deleted } = await deleteAllSavedDesigns(customerId, deps);
  const designIds = new Set(
    orders.flatMap((o) => o.lines.map((l) => l.designId)).filter(Boolean),
  );
  for (const id of designIds) {
    try {
      await deps.storage.deletePrefix(designFolder(id));
    } catch (err) {
      // An unsafe id can't name a folder of ours; nothing to delete.
      if (!(err instanceof Error && /Invalid designId/.test(err.message)))
        throw err;
    }
  }
  await deps.commerce.deleteCustomer(customerId);
  return { designsDeleted: deleted + designIds.size };
}

export interface ReorderDesign {
  design: DesignDocument;
  /** Short-lived download URLs of the ORIGINAL photos, by asset id. */
  assetUrls: Record<string, string>;
  thumbnailUrl?: string;
}

export const REORDER_GONE_MESSAGE =
  "This design is no longer stored, so it can't be ordered again. Please design it again.";

/**
 * "Order again": one design of one of the customer's own orders, with
 * download links for its photos. Another customer's order, or a design that
 * isn't on the order, looks missing.
 */
export async function reorderDesign(
  customerId: number,
  orderId: OrderId,
  designId: string,
  deps: {
    commerce: Pick<CommerceClient, "getCustomerOrder">;
    storage: Pick<ObjectStorage, "get" | "head" | "presignGet">;
  },
): Promise<ReorderDesign> {
  const order = await deps.commerce.getCustomerOrder(customerId, orderId);
  if (!order || !order.lines.some((l) => l.designId === designId))
    throw new AccountError("Order not found", 404);
  const raw = await deps.storage.get(designKey(designId));
  if (!raw) throw new AccountError(REORDER_GONE_MESSAGE, 404);
  const design: unknown = JSON.parse(new TextDecoder().decode(raw));
  if (!isDesignDocument(design))
    throw new AccountError(REORDER_GONE_MESSAGE, 404);
  const assetUrls: Record<string, string> = {};
  for (const a of collectAssetIds(design.fabric)) {
    if (!(await deps.storage.head(assetKey(designId, a))))
      throw new AccountError(REORDER_GONE_MESSAGE, 404);
    assetUrls[a] = await deps.storage.presignGet(assetKey(designId, a), {
      expiresInS: 15 * 60,
    });
  }
  const thumb = (await deps.storage.head(designThumbKey(designId)))
    ? await deps.storage.presignGet(designThumbKey(designId), {
        expiresInS: 15 * 60,
      })
    : undefined;
  return { design, assetUrls, ...(thumb ? { thumbnailUrl: thumb } : {}) };
}
