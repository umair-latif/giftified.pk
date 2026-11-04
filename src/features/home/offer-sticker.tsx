import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { OFFER, offerIsLive } from "@/config/site";

/**
 * The launch offer above the hero heading (founder, 4 Nov 2026): a round
 * yellow badge, slightly tilted like a sticker, with a straight pink strip
 * tucked behind it that says where the tap goes. The whole thing is one link.
 *
 * Yellow stays the badge's alone: the strip is pink so the hero's yellow
 * "Start designing" button is still the main action. Pink takes black text
 * (docs/brand.md).
 *
 * The badge's three lines are sized to sit inside the circle with at least
 * 4 px to spare at 360 px and on desktop (measured, 4 Nov 2026); a unit test caps their length, so keep
 * `OFFER.sticker` lines as short as they are. Shows only while the offer is
 * live, like the bar above the header.
 */
export function OfferSticker() {
  if (!offerIsLive()) return null;
  const { top, big, bottom, strip } = OFFER.sticker;
  return (
    <Link
      href={OFFER.href}
      data-testid="offer-sticker"
      aria-label={`${top}: ${big} ${bottom}. ${strip}`}
      className="press text-ink mb-4 inline-flex items-center no-underline"
    >
      <span
        data-testid="offer-badge"
        className="bg-action border-ink relative z-10 flex size-[104px] shrink-0 -rotate-6 flex-col items-center justify-center rounded-full border-[3px] text-center leading-none shadow-[4px_4px_0_var(--color-ink)] md:size-[116px]"
      >
        <span className="text-[9px] font-bold tracking-[0.02em] uppercase md:text-[10px]">
          {top}
        </span>
        <span className="font-display mt-1 mb-0.5 text-[29px] md:text-[32px]">
          {big}
        </span>
        <span className="text-[10.5px] font-semibold md:text-[11.5px]">
          {bottom}
        </span>
      </span>
      <span className="bg-highlight border-ink -ml-5 inline-flex items-center gap-1 rounded-r-xl border-[3px] py-2 pr-3.5 pl-8 text-[15px] font-bold whitespace-nowrap shadow-[4px_4px_0_var(--color-ink)] md:text-base">
        {strip}
        <ArrowRightIcon width={16} height={16} aria-hidden />
      </span>
    </Link>
  );
}
