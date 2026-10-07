"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";

export interface GalleryItem {
  src: string;
  alt: string;
  /** Thumbnail button label ("Front", "Photo 2"…). */
  label: string;
  /** Extra classes on the big image (e.g. object-cover, a zoom). */
  className?: string;
}

const ARROW =
  "focus-visible:ring-brand-600/40 absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center border-ink text-ink rounded-full border-2 bg-white shadow-[3px_3px_0_var(--color-ink)] hover:bg-mint-100 active:translate-y-[calc(-50%+2px)] active:shadow-none focus-visible:ring-2 focus-visible:outline-none disabled:hidden sm:grid";

/**
 * The one gallery for plain products and design products. The big picture is
 * a swipeable strip (scroll-snap: swipe on a phone, arrows from `sm` up);
 * below it, dots on a phone (every picture is reachable by swiping) and
 * thumbnails from `md` up. `testId` prefixes the data-testids
 * (`<id>-gallery`, `<id>-thumb-<n>`, `<id>-prev`, `<id>-next`).
 */
export function ImageGallery({
  items,
  testId,
  unoptimized = false,
  sizes = "(max-width: 768px) 100vw, 520px",
}: {
  items: GalleryItem[];
  testId: string;
  unoptimized?: boolean;
  sizes?: string;
}) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

  const goTo = useCallback((i: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  if (items.length === 0)
    return <div className="card bg-cream! aspect-square" />;

  return (
    <div className="min-w-0 space-y-3" data-testid={`${testId}-gallery`}>
      <div className="relative">
        <div
          ref={strip}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
            setIndex((cur) => (cur === i ? cur : i));
          }}
          className="card flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        >
          {items.map((s, i) => (
            <div
              key={s.src}
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden"
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                unoptimized={unoptimized}
                preload={i === 0}
                sizes={sizes}
                className={s.className ?? "object-contain"}
              />
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous picture"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              className={`${ARROW} left-2`}
              data-testid={`${testId}-prev`}
            >
              <ArrowLeftIcon />
            </button>
            <button
              type="button"
              aria-label="Next picture"
              disabled={index >= items.length - 1}
              onClick={() => goTo(index + 1)}
              className={`${ARROW} right-2`}
              data-testid={`${testId}-next`}
            >
              <ArrowRightIcon />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <ul
          className="flex flex-wrap justify-center gap-1 md:justify-start md:gap-2"
          aria-label="Views"
        >
          {items.map((s, i) => (
            <li key={s.src}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={s.label}
                aria-current={i === index}
                data-testid={`${testId}-thumb-${i}`}
                className={`focus-visible:ring-brand-600/60 relative block overflow-hidden focus-visible:ring-2 focus-visible:outline-none max-md:size-2.5 max-md:rounded-full max-md:after:absolute max-md:after:-inset-2 md:size-16 md:rounded-xl md:border-2 md:bg-white md:transition md:duration-150 ${
                  i === index
                    ? "bg-brand-600 md:border-brand-600 md:ring-brand-600 md:translate-x-0.5 md:translate-y-0.5 md:ring-2"
                    : "md:border-ink bg-zinc-300 hover:bg-zinc-400 md:shadow-[3px_3px_0_var(--color-ink)] md:hover:-translate-y-px"
                }`}
              >
                <Image
                  src={s.src}
                  alt=""
                  fill
                  unoptimized={unoptimized}
                  sizes="64px"
                  className="hidden object-cover md:block"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
