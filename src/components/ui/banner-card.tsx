import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { CardCta } from "./card-cta";

/**
 * A tappable card with a 2:1 picture (founder, 2 Nov 2026): on phones the
 * picture runs across the top at full width with the words underneath; from
 * `md` up the picture takes one half and the words the other.
 *
 * The artwork files are 1600x800 on a flat ground in one of our colours, and
 * `bg` must be that same colour: the card paints it behind the words, so on a
 * desktop the words' half reads as more of the same banner, not a band added
 * next to it. No divider between the two for the same reason.
 *
 * The picture keeps its 2:1 shape everywhere, so nothing is cropped; keep the
 * important parts away from the very edge anyway (docs/ops/banner-assets.md).
 *
 * Decorative: `alt` is empty, because the words next to it say the same thing.
 */
const BG = {
  /** Mint paper, the page background. */
  page: "bg-page",
  /** Teal. */
  brand: "bg-brand",
  /** Yellow. */
  action: "bg-action",
} as const;

export function BannerCard({
  href,
  bg,
  art,
  artSide = "right",
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
  /** Which half the picture takes from `md` up. On phones it is always on top. */
  artSide?: "left" | "right";
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
      className={`card card-pop flex flex-col overflow-hidden md:flex-row md:items-center ${BG[bg]} ${className}`}
    >
      <div
        className={`relative aspect-[2/1] w-full shrink-0 md:w-1/2 ${artSide === "right" ? "md:order-2" : ""}`}
      >
        <Image
          src={art}
          alt=""
          aria-hidden
          fill
          sizes="(min-width: 768px) 500px, calc(100vw - 32px)"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1 px-5 pt-1 pb-4 md:w-1/2 md:px-8 md:py-6">
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
