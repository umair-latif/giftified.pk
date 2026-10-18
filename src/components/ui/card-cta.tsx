import { ArrowRightIcon } from "./icons";

/**
 * The last line of every tappable card ("Start designing →"). Phones have no
 * hover, so this line, not the shadow, is what tells a shopper the card opens
 * something. Info blocks never have it (and never the black card outline).
 */
const TONE = {
  /** On white cards: the teal link colour. */
  accent: "text-accent-text",
  /**
   * On a brand-coloured card (PromoCard). The teal would sit on teal and fail
   * contrast, so this is ink, underlined so it still reads as a link.
   */
  onColour: "text-ink underline decoration-2 underline-offset-4",
} as const;

export function CardCta({
  children,
  className = "",
  tone = "accent",
}: {
  children: string;
  className?: string;
  tone?: keyof typeof TONE;
}) {
  return (
    <span
      className={`${TONE[tone]} inline-flex items-center gap-1 text-sm font-semibold ${className}`}
    >
      {children}
      <ArrowRightIcon width={16} height={16} aria-hidden />
    </span>
  );
}
