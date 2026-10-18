import { describe, expect, it } from "vitest";
import type { Review } from "@/lib/commerce/types";
import { withPhotoMarker } from "@/features/reviews/photo-marker";
import {
  aggregateRatingJsonLd,
  summariseReviews,
  toDisplayReview,
} from "@/features/reviews/review-model";

const review = (over: Partial<Review> = {}): Review => ({
  id: 1,
  wooProductId: 101,
  rating: 5,
  text: "Lovely",
  reviewer: "Ayesha",
  verified: true,
  createdAt: "2026-10-18T22:00:01Z",
  ...over,
});
const SIG = "A".repeat(22);

describe("review model", () => {
  it("shows nothing without reviews, else the rounded average", () => {
    expect(summariseReviews([])).toBeNull();
    const s = summariseReviews([
      review({ rating: 5 }),
      review({ rating: 4 }),
      review({ rating: 4 }),
    ]);
    expect(s).toEqual({ count: 3, average: 4.3 });
    expect(aggregateRatingJsonLd(s!)).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: 4.3,
      reviewCount: 3,
    });
  });

  it("strips the moderation photo line and keeps only our own photo paths", () => {
    const ours = withPhotoMarker(
      "Lovely",
      `https://shop.test/api/reviews/photo/12-0.${SIG}`,
    );
    expect(toDisplayReview(review({ text: ours }))).toMatchObject({
      text: "Lovely",
      photoPath: `/api/reviews/photo/12-0.${SIG}`,
    });
    const foreign = toDisplayReview(
      review({ text: withPhotoMarker("Hi", "https://evil.example/x.png") }),
    );
    expect(foreign.text).toBe("Hi");
    expect(foreign.photoPath).toBeUndefined();
  });

  it("falls back to a generic name", () => {
    expect(toDisplayReview(review({ reviewer: "" })).reviewer).toBe("Customer");
  });
});
