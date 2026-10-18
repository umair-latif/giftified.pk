import { getStorage } from "@/lib/storage";
import { reviewPhotoKey } from "@/lib/storage/keys";
import { verifyReviewPhotoRef } from "@/server/reviews/photo-link";

/** GET /api/reviews/photo/<orderId>-<line>.<sig> → redirect to a private storage link. */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/reviews/photo/[ref]">,
): Promise<Response> {
  const { ref } = await ctx.params;
  const claims = verifyReviewPhotoRef(ref);
  const key = claims && reviewPhotoKey(claims.orderId, claims.line);
  if (!key || !(await getStorage().head(key)))
    return new Response("Not found", { status: 404 });
  const url = await getStorage().presignGet(key, { expiresInS: 3600 });
  return new Response(null, {
    status: 302,
    headers: { location: url, "cache-control": "private, max-age=300" },
  });
}
