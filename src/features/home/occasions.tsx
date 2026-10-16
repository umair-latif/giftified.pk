import Link from "next/link";
import { CardCta } from "@/components/ui/card-cta";
import { Container } from "@/components/ui/page";
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

const fmt = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

/**
 * One large tile for the next occasion ("Order by 28 February to arrive in
 * time"), the rest as chips. The header menu keeps the full list.
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
        <Link
          href={`/occasions/${main.slug}`}
          className="card card-pop mt-4 flex min-h-28 flex-col justify-center gap-1 px-5 py-4"
          data-testid="featured-occasion"
        >
          <span className="type-eyebrow text-deep">
            {featured.date ? `Coming up · ${fmt(featured.date)}` : "Any time"}
          </span>
          <span className="type-card-title text-ink">{main.label} designs</span>
          <span className="text-ink text-sm">
            {featured.orderBy
              ? `Order by ${fmt(featured.orderBy)} to arrive in time.`
              : "Make their day with their name or a favourite photo."}
          </span>
          <CardCta className="mt-1">{`See ${main.label} designs`}</CardCta>
        </Link>
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
