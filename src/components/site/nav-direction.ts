/**
 * Which way a navigation goes in the shop's flow, for the page slide
 * (`page-transition.tsx`). Pure, so it is unit-tested.
 *
 * The flow, shallow → deep:
 * home → lists (products, occasions, info, account) → a product / template →
 * Design → Preview → Order step → cart → checkout → order status.
 * Going deeper slides forward (new page in from the right), shallower slides
 * back; the same level (e.g. one info page to another) just crossfades.
 */
export type NavDirection = "forward" | "back" | "fade";

const FLOW: readonly [RegExp, number][] = [
  [/^\/$/, 0],
  // A single template sits just below an occasion or product page that lists it.
  [/^\/designs\/[^/]+$/, 2.5],
  [/^\/design\/[^/]+$/, 3],
  [/^\/design\/[^/]+\/preview$/, 4],
  [/^\/design\/[^/]+\/order$/, 5],
  [/^\/cart$/, 6],
  [/^\/checkout$/, 7],
  [/^\/order\/[^/]+$/, 8],
];

/** Depth of a path in the flow; anything else goes by its number of segments. */
export function flowRank(pathname: string): number {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const [re, rank] of FLOW) if (re.test(path)) return rank;
  return Math.min(path.split("/").filter(Boolean).length, 2);
}

export function navDirection(from: string, to: string): NavDirection {
  const a = flowRank(from);
  const b = flowRank(to);
  return b > a ? "forward" : b < a ? "back" : "fade";
}
