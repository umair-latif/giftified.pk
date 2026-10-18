import { getCommerce } from "@/lib/commerce";
import { getStorage } from "@/lib/storage";
import { reviewLimiter } from "@/server/reviews/limiter";
import { ReviewError, submitReview } from "@/server/reviews/submit";

/** POST /api/reviews — file a review (held until the founder approves it). */
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
    const out = await submitReview(
      { commerce: getCommerce(), storage: getStorage() },
      body,
    );
    return Response.json(out, { status: 201 });
  } catch (err) {
    if (err instanceof ReviewError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error("[reviews] submit failed", err);
    return Response.json(
      { error: "Couldn’t save your review. Please try again." },
      { status: 500 },
    );
  }
}
