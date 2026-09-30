"use client";

import Image from "next/image";
import { useState } from "react";

interface Props {
  templateId: string;
  name: string;
  /** Product images (mockups) in display order; empty for older designs (thumbnail only). */
  images: { label: string }[];
  hasThumbnail: boolean;
}

/** Big picture plus thumbnails: the design on the product from several angles. */
export function DesignGallery({
  templateId,
  name,
  images,
  hasThumbnail,
}: Props) {
  const id = encodeURIComponent(templateId);
  const sources = images.length
    ? images.map((img, i) => ({
        label: img.label,
        src: `/api/templates/${id}/images/${i}`,
      }))
    : hasThumbnail
      ? [{ label: "Design", src: `/api/templates/${id}/thumbnail` }]
      : [];
  const [index, setIndex] = useState(0);
  const shown = sources[index];
  if (!shown)
    return (
      <div className="bg-cream aspect-square rounded-3xl ring-1 ring-zinc-200" />
    );
  return (
    <div className="space-y-2" data-testid="design-gallery">
      <div className="bg-cream relative aspect-square overflow-hidden rounded-3xl ring-1 ring-zinc-200">
        <Image
          key={shown.src}
          src={shown.src}
          alt={`${name}, ${shown.label.toLowerCase()} view`}
          fill
          unoptimized
          preload={index === 0}
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-contain"
        />
      </div>
      {sources.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Views">
          {sources.map((s, i) => (
            <li key={s.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={s.label}
                aria-current={i === index}
                data-testid={`design-thumb-${i}`}
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
                  unoptimized
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
