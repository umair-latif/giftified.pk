import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { getSessionCustomerId } from "@/server/auth/cookies";
import { AccountError, reorderDesign } from "@/server/account/service";

/**
 * GET /api/account/orders/<id>/designs/<designId> — "Order again" (task 21):
 * the design of one of the signed-in customer's orders, with short-lived
 * links to its photos, so the browser can put it back in the cart.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/account/orders/[id]/designs/[designId]">,
): Promise<Response> {
  const { id, designId } = await ctx.params;
  const customerId = await getSessionCustomerId();
  if (!customerId)
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  if (!/^\d{1,12}$/.test(id))
    return Response.json({ error: "Order not found" }, { status: 404 });
  try {
    return Response.json(
      await reorderDesign(customerId, Number(id), designId, {
        commerce: getCommerce(),
        storage: getStorage(),
      }),
    );
  } catch (err) {
    if (err instanceof AccountError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error("[account] order again failed", err);
    return Response.json(
      { error: "Couldn't load this design just now. Please try again." },
      { status: 500 },
    );
  }
}
