import { openSavedDesign, savedDesignsResponse } from "@/server/saved-designs";

/**
 * GET /api/account/designs/<id> — the saved design plus short-lived URLs of
 * its photos, so the editor can continue it on any device.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/account/designs/[id]">,
): Promise<Response> {
  const { id } = await ctx.params;
  return savedDesignsResponse("open", async (customerId, deps) => {
    const r = await openSavedDesign(customerId, id, deps);
    return {
      meta: {
        id: r.entry.id,
        productId: r.entry.productId,
        name: r.entry.name,
      },
      design: r.design,
      assetUrls: r.assetUrls,
    };
  });
}
