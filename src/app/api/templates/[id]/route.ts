import { getStorage } from "@/lib/storage";
import { getTemplate, templateAssetUrls } from "@/server/templates";

/**
 * GET /api/templates/<id> — a PUBLISHED template for the editor: its design
 * plus short-lived URLs for the sample photos. Unpublished ids look missing.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/templates/[id]">,
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    const storage = getStorage();
    const detail = await getTemplate(id, {}, storage);
    if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      meta: detail.meta,
      design: detail.design,
      assetUrls: await templateAssetUrls(detail, storage),
    });
  } catch (err) {
    console.error("[templates] load failed", err);
    return Response.json({ error: "Couldn't load template" }, { status: 500 });
  }
}
