import { ArrowRightIcon } from "./icons";

/**
 * The last line of every tappable card ("Start designing →"). Phones have no
 * hover, so this line, not the shadow, is what tells a shopper the card opens
 * something. Info blocks never have it (and never the black card outline).
 */
export function CardCta({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={`text-accent-text inline-flex items-center gap-1 text-sm font-semibold ${className}`}
    >
      {children}
      <ArrowRightIcon width={16} height={16} aria-hidden />
    </span>
  );
}
