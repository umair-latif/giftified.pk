import { getStorage, templateImageKey } from "@/lib/storage";
import { getTemplate } from "@/server/templates";

/**
 * GET /api/templates/<id>/images/<n> — product image `n` (a mockup of the
 * design on the product) of a PUBLISHED template. The bucket is private, so
 * we stream the WebP ourselves and let the CDN cache it.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/templates/[id]/images/[n]">,
): Promise<Response> {
  const { id, n } = await ctx.params;
  const index = /^\d{1,2}$/.test(n) ? Number(n) : -1;
  try {
    const storage = getStorage();
    const detail = await getTemplate(id, {}, storage);
    if (!detail || index < 0 || index >= (detail.meta.images?.length ?? 0))
      return new Response(null, { status: 404 });
    const bytes = await storage.get(templateImageKey(id, index));
    if (!bytes) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[templates] image failed", err);
    return new Response(null, { status: 500 });
  }
}
