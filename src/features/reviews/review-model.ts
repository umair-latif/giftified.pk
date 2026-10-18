import type { Review } from "@/lib/commerce/types";
import { splitPhotoMarker } from "./photo-marker";

/** Pure review logic for the shop pages (task 30). */

export interface ReviewSummary {
  count: number;
  /** One decimal, e.g. 4.7. */
  average: number;
}

export interface DisplayReview {
  id: number;
  rating: number;
  text: string;
  reviewer: string;
  verified: boolean;
  /** ISO 8601. */
  createdAt: string;
  /** Path on this site (`/api/reviews/photo/…`), only when valid. */
  photoPath?: string;
}

const PHOTO_PATH = /^\/api\/reviews\/photo\/\d{1,12}-\d{1,2}\.[\w-]{22}$/;

/** Photo path from a review's `[photo: <url>]` line, only if it is one of ours. */
function photoPathOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { pathname } = new URL(url);
    return PHOTO_PATH.test(pathname) ? pathname : undefined;
  } catch {
    return undefined;
  }
}

export function toDisplayReview(r: Review): DisplayReview {
  const { text, photoUrl } = splitPhotoMarker(r.text);
  const photoPath = photoPathOf(photoUrl);
  return {
    id: r.id,
    rating: r.rating,
    text,
    reviewer: r.reviewer || "Customer",
    verified: r.verified,
    createdAt: r.createdAt,
    ...(photoPath ? { photoPath } : {}),
  };
}

/** Null when there are no reviews: the shop shows nothing, never "0 reviews". */
export function summariseReviews(reviews: Review[]): ReviewSummary | null {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    count: reviews.length,
    average: Math.round((total / reviews.length) * 10) / 10,
  };
}

export function aggregateRatingJsonLd(
  s: ReviewSummary,
): Record<string, unknown> {
  return {
    "@type": "AggregateRating",
    ratingValue: s.average,
    reviewCount: s.count,
    bestRating: 5,
    worstRating: 1,
  };
}
