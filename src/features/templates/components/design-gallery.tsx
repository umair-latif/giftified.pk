"use client";

import { ImageGallery } from "@/components/ui/image-gallery";

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
  return (
    <ImageGallery
      testId="design"
      unoptimized
      sizes="(max-width: 768px) 100vw, 480px"
      items={sources.map((s) => ({
        ...s,
        alt: `${name}, ${s.label.toLowerCase()} view`,
        className: `object-contain ${s.label === "Design" ? "" : "md:scale-[1.2]"}`,
      }))}
    />
  );
}
