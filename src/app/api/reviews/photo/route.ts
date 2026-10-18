import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { reviewLimiter } from "@/server/reviews/limiter";
import { ReviewError, startReviewPhotoUpload } from "@/server/reviews/submit";

/** POST /api/reviews/photo — a direct-upload link for the review photo. */
export async function POST(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (reviewLimiter.isLimited(ip))
    return Response.json(
      { error: "Too many tries. Please wait." },
      { status: 429 },
    );
  reviewLimiter.hit(ip);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    return Response.json(
      await startReviewPhotoUpload(
        { commerce: getCommerce(), storage: getStorage() },
        body,
      ),
    );
  } catch (err) {
    if (err instanceof ReviewError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error("[reviews] photo upload link failed", err);
    return Response.json(
      { error: "Couldn’t start the upload. Please try again." },
      { status: 500 },
    );
  }
}
