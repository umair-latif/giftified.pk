import type { Review } from "@/lib/commerce/types";
import { summariseReviews, toDisplayReview } from "../review-model";

const SHOWN = 20;

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} role="img">
      <span aria-hidden className="text-deep tracking-wide">
        {"★".repeat(Math.round(rating))}
        {"☆".repeat(5 - Math.round(rating))}
      </span>
    </span>
  );
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

/** Approved customer reviews. Renders nothing until there is at least one. */
export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  const summary = summariseReviews(reviews);
  if (!summary) return null;
  const shown = reviews.slice(0, SHOWN).map(toDisplayReview);
  return (
    <section
      aria-labelledby="reviews-title"
      className="card p-4 lg:p-6"
      data-testid="reviews"
    >
      <h2 id="reviews-title" className="type-card-title text-ink">
        Customer reviews
      </h2>
      <p className="mt-1 flex items-center gap-2 text-sm">
        <Stars rating={summary.average} />
        <span>
          <strong className="font-semibold">{summary.average}</strong> out of 5
          · {summary.count} {summary.count === 1 ? "review" : "reviews"}
        </span>
      </p>
      <ul className="mt-4 flex flex-col gap-4">
        {shown.map((r) => (
          <li
            key={r.id}
            className="border-ink/15 border-t pt-4 first:border-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-x-2 text-sm">
              <Stars rating={r.rating} />
              <span className="font-semibold">{r.reviewer}</span>
              {r.verified && (
                <span className="text-ink/70">· Verified buyer</span>
              )}
              <span className="text-ink/70">· {date(r.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-line">{r.text}</p>
            {r.photoPath && (
              // eslint-disable-next-line @next/next/no-img-element -- redirects to a short-lived private storage link
              <img
                src={r.photoPath}
                alt={`Photo from ${r.reviewer}`}
                loading="lazy"
                className="border-ink mt-2 h-28 w-28 rounded-xl border-2 object-cover"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
