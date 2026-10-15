import { DELIVERY_DAYS } from "@/lib/delivery";

/**
 * Dated occasions, for the home page's "next occasion" tile. 14 August and
 * Mother's Day (2nd Sunday of May) are fixed rules; Eid dates depend on the
 * moon sighting, so these are the expected dates in Pakistan.
 * TODO(owner): check each Eid date a few weeks before and correct it here.
 */
const EID: readonly { slug: "eid"; date: string }[] = [
  { slug: "eid", date: "2027-03-10" }, // Eid ul-Fitr (expected)
  { slug: "eid", date: "2027-05-17" }, // Eid ul-Adha (expected)
  { slug: "eid", date: "2028-02-27" }, // Eid ul-Fitr (expected)
  { slug: "eid", date: "2028-05-05" }, // Eid ul-Adha (expected)
];

/** Feature a dated occasion only when it is this close (days). */
export const FEATURE_WITHIN_DAYS = 60;
/** Without one, feature this (it is never out of season). */
export const FALLBACK_OCCASION = "birthday";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

function secondSundayOfMay(year: number): Date {
  const first = utc(year, 4, 1);
  const toSunday = (7 - first.getUTCDay()) % 7;
  return utc(year, 4, 1 + toSunday + 7);
}

function datedFor(year: number): { slug: string; date: Date }[] {
  return [
    { slug: "14-august", date: utc(year, 7, 14) },
    { slug: "mothers-day", date: secondSundayOfMay(year) },
    ...EID.filter((e) => e.date.startsWith(String(year))).map((e) => ({
      slug: e.slug,
      date: new Date(`${e.date}T00:00:00Z`),
    })),
  ];
}

export interface FeaturedOccasion {
  slug: string;
  /** The occasion day, or null for the undated fallback. */
  date: Date | null;
  /** Last day to order so it arrives in time (date − the longest delivery). */
  orderBy: Date | null;
}

/** The next occasion worth featuring on the home page, from `today` (UTC date). */
export function featuredOccasion(today: Date): FeaturedOccasion {
  const day = utc(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const y = day.getUTCFullYear();
  const upcoming = [...datedFor(y), ...datedFor(y + 1)]
    .map((o) => ({
      ...o,
      orderBy: new Date(o.date.getTime() - DELIVERY_DAYS.max * 86_400_000),
    }))
    .filter((o) => o.orderBy.getTime() >= day.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const next = upcoming[0];
  if (
    next &&
    next.date.getTime() - day.getTime() <= FEATURE_WITHIN_DAYS * 86_400_000
  )
    return next;
  return { slug: FALLBACK_OCCASION, date: null, orderBy: null };
}
