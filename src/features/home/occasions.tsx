import Link from "next/link";
import { CardCta } from "@/components/ui/card-cta";
import { Container } from "@/components/ui/page";
import { PromoCard } from "@/components/ui/promo-card";
import type { FeaturedOccasion } from "@/config/occasion-dates";

/** Each occasion opens `/occasions/<slug>` (task 19): the templates for that occasion. */
export const OCCASIONS: readonly { slug: string; label: string }[] = [
  { slug: "eid", label: "Eid" },
  { slug: "birthday", label: "Birthday" },
  { slug: "shaadi", label: "Shaadi" },
  { slug: "anniversary", label: "Anniversary" },
  { slug: "mothers-day", label: "Mother's Day" },
  { slug: "14-august", label: "14 August" },
  { slug: "team-corporate", label: "Team / Corporate" },
  { slug: "everyday", label: "Everyday" },
];

/**
 * Artwork behind the featured tile, per occasion. Occasions without a picture
 * fall back to the plain tile, so a new occasion never ships a broken one.
 * 1200x400 WebP with a flat `brand`-teal left half (docs/ops/banner-assets.md).
 */
const OCCASION_ART: Partial<Record<string, string>> = {
  birthday: "/banners/occasion-birthday.webp",
};

/**
 * One large tile for the next occasion, the rest as chips. The header menu
 * keeps the full list.
 *
 * The order-by date is deliberately not shown (founder, 18 Oct 2026): it comes
 * back from `featuredOccasion()` and waits for the admin UI, so campaigns can
 * be timed by hand before we put a deadline in front of customers.
 */
export function Occasions({ featured }: { featured: FeaturedOccasion }) {
  const main = OCCASIONS.find((o) => o.slug === featured.slug) ?? OCCASIONS[1]!;
  const rest = OCCASIONS.filter((o) => o.slug !== main.slug);
  return (
    <section aria-labelledby="home-occasions" className="pt-10">
      <Container width="wide">
        <h2 id="home-occasions" className="type-section text-deep">
          Make it for any moment
        </h2>
        <p className="text-ink mt-1 text-sm">
          Pick a moment and start from a ready-made design.
        </p>
        {OCCASION_ART[main.slug] ? (
          <PromoCard
            href={`/occasions/${main.slug}`}
            bg="brand"
            art={OCCASION_ART[main.slug]!}
            eyebrow={featured.date ? "Coming up" : "Any time"}
            title={`${main.label} designs`}
            body="Start from a ready-made design and make it yours."
            cta={`See ${main.label} designs`}
            testId="featured-occasion"
            className="mt-4"
          />
        ) : (
          <Link
            href={`/occasions/${main.slug}`}
            className="card card-pop mt-4 flex min-h-28 flex-col justify-center gap-1 px-5 py-4"
            data-testid="featured-occasion"
          >
            <span className="type-eyebrow text-deep">
              {featured.date ? "Coming up" : "Any time"}
            </span>
            <span className="type-card-title text-ink">
              {main.label} designs
            </span>
            <span className="text-ink text-sm">
              Start from a ready-made design and make it yours.
            </span>
            <CardCta className="mt-1">{`See ${main.label} designs`}</CardCta>
          </Link>
        )}
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="More occasions">
          {rest.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/occasions/${o.slug}`}
                className="border-ink text-ink lift press inline-flex h-11 items-center rounded-full border-2 bg-white px-4 text-sm font-semibold"
              >
                {o.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
