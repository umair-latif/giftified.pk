import { getStorage, templateThumbKey } from "@/lib/storage";
import { getTemplate } from "@/server/templates";

/**
 * GET /api/templates/<id>/thumbnail — the gallery thumbnail of a PUBLISHED
 * template. The bucket is private, so we stream the (small) WebP ourselves
 * and let the CDN cache it.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/templates/[id]/thumbnail">,
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    const storage = getStorage();
    const detail = await getTemplate(id, {}, storage);
    if (!detail?.meta.hasThumbnail) return new Response(null, { status: 404 });
    const bytes = await storage.get(templateThumbKey(id));
    if (!bytes) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[templates] thumbnail failed", err);
    return new Response(null, { status: 500 });
  }
}
