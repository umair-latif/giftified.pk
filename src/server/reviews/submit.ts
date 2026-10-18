import { z } from "zod";
import {
  neutralisePhotoMarker,
  withPhotoMarker,
} from "@/features/reviews/photo-marker";
import { loadOrderForLink } from "@/features/orders/order-access";
import type { CommerceClient } from "@/lib/commerce/types";
import { reviewMarkerKey, reviewPhotoKey } from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import type { Order, OrderLine } from "@/types/order";
import { reviewPhotoUrl } from "./photo-link";

/**
 * Task 30: a verified buyer reviews one line of a COMPLETED order, through
 * the private order link. Framework-free (deps injected) so it is unit-tested.
 * Checks the buyer ourselves; WooCommerce can't. One review per order line,
 * kept by a marker object in storage (`reviewMarkerKey`).
 */
export const REVIEW_TEXT_MAX = 2000;
export const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const link = {
  orderId: z.number().int().positive(),
  token: z.string().max(100),
  line: z.number().int().min(0).max(99),
};

export const photoUploadSchema = z.object({
  ...link,
  contentType: z.enum(["image/webp", "image/jpeg"]),
});

export const reviewSchema = z.object({
  ...link,
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(REVIEW_TEXT_MAX),
  name: z.string().trim().min(1).max(60),
  hasPhoto: z.boolean(),
});

export interface ReviewDeps {
  commerce: Pick<
    CommerceClient,
    "getOrder" | "getProduct" | "getDesignProduct" | "createReview"
  >;
  storage: ObjectStorage;
  env?: Record<string, string | undefined>;
  now?: () => number;
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success)
    throw new ReviewError("Please check your review and try again.", 400);
  return r.data;
}

async function reviewableLine(
  deps: ReviewDeps,
  input: z.infer<z.ZodObject<typeof link>>,
): Promise<{ order: Order; line: OrderLine }> {
  const order = await loadOrderForLink(
    String(input.orderId),
    input.token,
    deps.commerce,
    deps.env,
  );
  if (!order) throw new ReviewError("This review link isn’t valid.", 404);
  if (order.status !== "completed")
    throw new ReviewError(
      "You can review your order once it has been delivered.",
      409,
    );
  const line = order.lines[input.line];
  if (!line) throw new ReviewError("That item isn’t in this order.", 400);
  if (await deps.storage.head(reviewMarkerKey(order.id, input.line)))
    throw new ReviewError("You’ve already reviewed this item.", 409);
  return { order, line };
}

/** WooCommerce product the review is filed under (the design product, else the base product). */
async function reviewProductId(
  deps: ReviewDeps,
  line: OrderLine,
): Promise<number> {
  const id = line.templateId
    ? (await deps.commerce.getDesignProduct(line.templateId))?.wooProductId
    : (await deps.commerce.getProduct(line.productId))?.wooProductId;
  if (!id) throw new ReviewError("This item can’t be reviewed.", 422);
  return id;
}

/** Step 1 (only with a photo): a link the phone uploads the photo to. */
export async function startReviewPhotoUpload(
  deps: ReviewDeps,
  input: unknown,
): Promise<{ uploadUrl: string }> {
  const req = parse(photoUploadSchema, input);
  const { order } = await reviewableLine(deps, req);
  const uploadUrl = await deps.storage.presignPut(
    reviewPhotoKey(order.id, req.line),
    { contentType: req.contentType, expiresInS: 600 },
  );
  return { uploadUrl };
}

/** Step 2: files the review (on hold) and marks the line as reviewed. */
export async function submitReview(
  deps: ReviewDeps,
  input: unknown,
): Promise<{ reviewId: number }> {
  const req = parse(reviewSchema, input);
  const { order, line } = await reviewableLine(deps, req);
  const photoKey = reviewPhotoKey(order.id, req.line);

  if (req.hasPhoto) {
    const info = await deps.storage.head(photoKey);
    if (!info)
      throw new ReviewError("Your photo didn’t upload. Please try again.", 400);
    if (info.size > REVIEW_PHOTO_MAX_BYTES) {
      await deps.storage.delete(photoKey);
      throw new ReviewError("That photo is too large (5 MB at most).", 400);
    }
  }

  const text = neutralisePhotoMarker(req.text);
  const review = await deps.commerce.createReview({
    wooProductId: await reviewProductId(deps, line),
    rating: req.rating,
    text: req.hasPhoto
      ? withPhotoMarker(text, reviewPhotoUrl(order.id, req.line, deps.env))
      : text,
    reviewer: req.name,
    reviewerEmail: order.email ?? `order-${order.id}@reviews.invalid`,
  });
  await deps.storage.put(
    reviewMarkerKey(order.id, req.line),
    JSON.stringify({
      reviewId: review.id,
      hasPhoto: req.hasPhoto,
      at: new Date((deps.now ?? Date.now)()).toISOString(),
    }),
    { contentType: "application/json" },
  );
  return { reviewId: review.id };
}
