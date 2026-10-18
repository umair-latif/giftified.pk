import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { CardCta } from "./card-cta";

/**
 * A tappable card with artwork on the right and words on the left (founder,
 * 18 Oct 2026). Used for the home page's occasion tile and the "ready-made
 * designs" card under the product grid.
 *
 * The artwork files are 1200x400 with a flat left half in one of our colours,
 * and `bg` must be that same colour: the card paints it, the picture sits on
 * top at the right, and the two meet with no seam. The picture is a fixed
 * share of the width rather than the whole card, so the words keep their room
 * at 360 px; `object-right` means a narrow card drops the left of the artwork
 * (the flat part we are already painting) instead of crowding the text.
 *
 * Decorative: `alt` is empty, because the words next to it say the same thing.
 */
const BG = {
  /** Teal. */
  brand: "bg-brand",
  /** Yellow. */
  action: "bg-action",
} as const;

export function PromoCard({
  href,
  bg,
  art,
  eyebrow,
  title,
  body,
  cta,
  testId,
  className = "",
}: {
  href: Route;
  bg: keyof typeof BG;
  art: string;
  eyebrow?: string;
  title: string;
  body: string;
  cta: string;
  testId?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={`card card-pop relative isolate flex min-h-36 flex-col justify-center gap-1 overflow-hidden py-4 pr-2 pl-5 ${BG[bg]} ${className}`}
    >
      <Image
        src={art}
        alt=""
        aria-hidden
        width={1200}
        height={400}
        sizes="(min-width: 768px) 480px, 160px"
        /*
         * The artwork fades into the flat colour instead of stopping at a
         * straight edge (founder, 18 Oct 2026). A vertical cut is only
         * invisible when it lands on empty ground — fine for the birthday
         * art, which is separate objects, but the mug grid runs edge to edge
         * and the cut went through a mug. A fade works whatever the artwork.
         *
         * The mask makes the left 30% of the picture transparent, so the
         * picture is wider than it was to keep the same amount of it visible.
         * Inline rather than a Tailwind class so the -webkit- prefix is
         * there: Safari on iOS still needs it, and that is most of our
         * traffic.
         */
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 30%)",
          maskImage: "linear-gradient(to right, transparent, #000 30%)",
        }}
        className="absolute inset-y-0 right-0 -z-10 h-full w-[44%] object-cover object-right md:w-[50%]"
      />
      <div className="relative max-w-[62%] md:max-w-[58%]">
        {eyebrow && <span className="type-eyebrow text-deep">{eyebrow}</span>}
        <p className="type-card-title text-ink mt-0.5">{title}</p>
        <p className="text-ink mt-0.5 text-sm">{body}</p>
        <CardCta className="mt-1" tone={bg === "brand" ? "onColour" : "accent"}>
          {cta}
        </CardCta>
      </div>
    </Link>
  );
}
