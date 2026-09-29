import Link from "next/link";
import { Container } from "@/components/ui/page";

/** Phase A: every tile opens the catalog. Task 19 points them to `/occasions/<slug>`. */
export const OCCASIONS: readonly { slug: string; label: string }[] = [
  { slug: "eid", label: "Eid" },
  { slug: "birthday", label: "Birthday" },
  { slug: "shaadi", label: "Shaadi" },
  { slug: "anniversary", label: "Anniversary" },
  { slug: "mothers-day", label: "Mother's Day" },
  { slug: "14-august", label: "14 August" },
  { slug: "team-corporate", label: "Team / Corporate" },
];

/** Alternate the two seasonal accents (docs/brand.md); both pass AA with their text colour. */
const TILE_STYLES = ["bg-magenta text-white", "bg-sunny text-ink"] as const;

export function Occasions() {
  return (
    <section aria-labelledby="home-occasions" className="pt-10">
      <Container width="wide">
        <h2 id="home-occasions" className="text-brand-900 text-2xl">
          Gifts for every occasion
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OCCASIONS.map((o, i) => (
            <li
              key={o.slug}
              className={
                i === OCCASIONS.length - 1 ? "col-span-2 sm:col-span-1" : ""
              }
            >
              <Link
                href="/products"
                className={`${TILE_STYLES[i % TILE_STYLES.length]} focus-visible:ring-brand-600/40 flex min-h-16 items-center justify-center rounded-2xl px-3 text-center font-medium shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none active:opacity-80`}
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
