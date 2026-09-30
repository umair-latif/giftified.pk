"use client";

import Image from "next/image";
import { useState } from "react";

export interface GalleryItem {
  src: string;
  alt: string;
  /** Thumbnail button label ("Front", "Photo 2"…). */
  label: string;
  /** Extra classes on the big image (e.g. object-cover, a zoom). */
  className?: string;
}

/**
 * Big square picture plus a row of thumbnails — the one gallery look for
 * plain products and design products. `testId` prefixes the data-testids
 * (`<id>-gallery`, `<id>-thumb-<n>`).
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
  const shown = items[index] ?? items[0];
  if (!shown)
    return (
      <div className="bg-cream aspect-square rounded-3xl ring-1 ring-zinc-200" />
    );
  return (
    <div className="min-w-0 space-y-2" data-testid={`${testId}-gallery`}>
      <div className="bg-cream relative aspect-square overflow-hidden rounded-3xl ring-1 ring-zinc-200">
        <Image
          key={shown.src}
          src={shown.src}
          alt={shown.alt}
          fill
          unoptimized={unoptimized}
          preload={index === 0}
          sizes={sizes}
          className={shown.className ?? "object-contain"}
        />
      </div>
      {items.length > 1 && (
        <ul
          className="flex max-w-full [scrollbar-width:none] gap-2 overflow-x-auto p-1 md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden"
          aria-label="Views"
        >
          {items.map((s, i) => (
            <li key={s.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={s.label}
                aria-current={i === index}
                data-testid={`${testId}-thumb-${i}`}
                className={`focus-visible:ring-brand-600/60 relative block size-16 overflow-hidden rounded-lg bg-white ring-2 focus-visible:outline-none ${
                  i === index
                    ? "ring-brand-600"
                    : "ring-zinc-200 hover:ring-zinc-300"
                }`}
              >
                <Image
                  src={s.src}
                  alt=""
                  fill
                  unoptimized={unoptimized}
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
