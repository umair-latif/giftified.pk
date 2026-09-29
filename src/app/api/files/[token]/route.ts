import { getStorage } from "@/lib/storage";
import { fileLinkSecret, verifyFileToken } from "@/server/files/links";

/** GET /api/files/<signed token> → redirect to a 5-minute private storage link. */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/files/[token]">,
): Promise<Response> {
  const { token } = await ctx.params;
  const claims = verifyFileToken(token, fileLinkSecret());
  // Links are only ever issued for order files; never for designs/photos.
  if (!claims || !claims.k.startsWith("orders/"))
    return new Response("This link is invalid or has expired.", {
      status: 404,
    });
  // Print files are deleted 30 days after delivery (task 24); say so plainly
  // instead of redirecting to the storage provider's XML error.
  if (!(await getStorage().head(claims.k)))
    return new Response(
      "This file is no longer available: print files are deleted 30 days after the order is delivered or cancelled.",
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  const url = await getStorage().presignGet(claims.k, {
    expiresInS: 300,
    downloadName: claims.n,
  });
  return new Response(null, {
    status: 302,
    headers: { location: url, "cache-control": "no-store" },
  });
}
