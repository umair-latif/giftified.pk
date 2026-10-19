import { revalidateTag } from "next/cache";
import { handleReviewWebhook } from "@/features/reviews/review-webhook";
import { REVIEWS_CACHE_TAG } from "@/lib/commerce/woocommerce";

/** Optional: drops the cached reviews when one is approved (docs/ops/woocommerce-staging.md). */
export async function POST(req: Request): Promise<Response> {
  return handleReviewWebhook(req, process.env.WC_WEBHOOK_SECRET, () =>
    revalidateTag(REVIEWS_CACHE_TAG, "max"),
  );
}
