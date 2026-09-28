import { verifyOrderToken } from "@/server/orders/order-link";
import type { CommerceClient } from "@/lib/commerce/types";
import type { Order } from "@/types/order";

/** Shape of a token made by `orderToken` (16 bytes, base64url). */
const TOKEN_RE = /^[\w-]{22}$/;

/**
 * The order behind `/order/<id>?t=<token>`, or null (→ 404) when the id is
 * malformed, the token is missing/malformed/wrong, or the order doesn't exist.
 * A request without a well-formed token never reaches the store, and a wrong
 * token looks exactly like a missing order.
 */
export async function loadOrderForLink(
  idParam: string,
  token: string | string[] | undefined,
  commerce: Pick<CommerceClient, "getOrder">,
  env: Record<string, string | undefined> = process.env,
): Promise<Order | null> {
  if (!/^\d{1,12}$/.test(idParam)) return null;
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return null;
  const order = await commerce.getOrder(Number(idParam));
  if (!order) return null;
  return verifyOrderToken(order.id, order.customer.phone, token, env)
    ? order
    : null;
}
