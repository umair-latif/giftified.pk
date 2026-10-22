import Link from "next/link";
import { OFFER, offerIsLive } from "@/config/site";

/**
 * Thin offer bar above the shop header (`OFFER` in config/site.ts). The whole
 * bar is one link. Announcement bars are ink, never yellow (docs/brand.md).
 */
export function OfferBanner() {
  if (!offerIsLive()) return null;
  return (
    <Link
      href={OFFER.href}
      className="bg-ink block px-4 py-2 text-center text-white no-underline"
      data-testid="offer-banner"
    >
      <span className="block text-sm font-semibold">
        {OFFER.headline} <span className="underline">{OFFER.cta}</span>
      </span>
      <span className="block text-xs text-white/75">{OFFER.terms}</span>
    </Link>
  );
}
