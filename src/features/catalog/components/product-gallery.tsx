import Image from "next/image";
import type { CatalogImage } from "@/lib/commerce/types";

/** Swipeable gallery: CSS scroll-snap, no library, no client JS. */
export function ProductGallery({ images }: { images: CatalogImage[] }) {
  if (images.length === 0) return null;
  return (
    <ul
      className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2"
      aria-label="Product photos"
    >
      {images.map((img, i) => (
        <li key={img.src} className="w-4/5 shrink-0 snap-center sm:w-64">
          <Image
            src={img.src}
            alt={img.alt}
            width={640}
            height={640}
            sizes="(max-width: 640px) 80vw, 256px"
            className="aspect-square w-full rounded-xl object-cover"
            loading={i === 0 ? "eager" : "lazy"}
          />
        </li>
      ))}
    </ul>
  );
}
