import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/page";
import type { DesignPrice } from "../load-design-prices";
import { DesignTile } from "./design-tile";

export interface ShelfItem {
  id: string;
  href: string;
  name: string;
  subtitle: string;
  image: { src: string; kind: "mockup" | "art" } | null;
  price?: DesignPrice;
  /** Under the tile, e.g. the template editors' Delete button. */
  extra?: ReactNode;
}

/**
 * The marketplace shelf for ready-made designs: a full-width banana-yellow
 * band with thick ink lines, frameless tiles in a swipeable row on a phone
 * and a grid of six from `lg`. Used by the home page ("New designs") and the
 * product pages ("Ready-made designs"), so both look the same.
 */
export function DesignShelf({
  id,
  headingId,
  title,
  intro,
  items,
  empty,
  more,
  testId,
  tileTestId,
  className = "",
}: {
  /** Anchor, e.g. "designs" for /products/mug#designs. */
  id?: string;
  headingId: string;
  title: string;
  intro?: ReactNode;
  items: ShelfItem[];
  /** Shown instead of the row when there are no designs. */
  empty?: ReactNode;
  /** "See all designs" link under the row (shown only when there are designs). */
  more?: { href: string; label: string };
  testId?: string;
  tileTestId?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`bg-sunny border-ink border-y-[3px] py-8 ${className}`}
      data-testid={testId}
    >
      <Container width="wide">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h2 id={headingId} className="text-ink text-2xl">
            {title}
          </h2>
          {items.length > 0 && (
            <span className="border-ink text-ink rounded-full border-2 bg-white px-2.5 py-0.5 text-xs font-semibold">
              100% customisable
            </span>
          )}
        </div>
        {intro && <p className="text-ink mt-1 text-sm">{intro}</p>}
        {items.length === 0 ? (
          empty
        ) : (
          <ul className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pt-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {items.map((t) => (
              <li
                key={t.id}
                className="flex w-[40%] shrink-0 snap-start flex-col sm:w-[28%] lg:w-auto"
              >
                <DesignTile
                  variant="shelf"
                  {...(tileTestId ? { testId: tileTestId } : {})}
                  href={t.href}
                  name={t.name}
                  subtitle={t.subtitle}
                  image={t.image}
                  {...(t.price ? { price: t.price } : {})}
                />
                {t.extra}
              </li>
            ))}
          </ul>
        )}
        {more && items.length > 0 && (
          <Link
            href={more.href}
            className={buttonClass("secondary", "mt-4")}
            data-testid={testId ? `${testId}-more` : undefined}
          >
            {more.label}
            <ArrowRightIcon width={18} height={18} />
          </Link>
        )}
      </Container>
    </section>
  );
}
