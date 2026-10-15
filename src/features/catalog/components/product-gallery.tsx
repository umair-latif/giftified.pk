import { ImageGallery } from "@/components/ui/image-gallery";
import type { CatalogImage } from "@/lib/commerce/types";

/**
 * The product's WooCommerce photos in the same gallery as design products.
 * The same photo added twice in Woo shows once. Each photo keeps its Woo alt
 * text when it is its own (not just the product name, not shared with another
 * photo); otherwise it gets "<name>, photo 2 of 4" so every alt is unique.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: CatalogImage[];
  name: string;
}) {
  const unique = images.filter(
    (img, i) => images.findIndex((o) => o.src === img.src) === i,
  );
  const altCount = new Map<string, number>();
  for (const img of unique) {
    const a = img.alt.trim().toLowerCase();
    altCount.set(a, (altCount.get(a) ?? 0) + 1);
  }
  const ownAlt = (alt: string) => {
    const a = alt.trim().toLowerCase();
    return a !== "" && a !== name.trim().toLowerCase() && altCount.get(a) === 1;
  };
  return (
    <ImageGallery
      testId="product"
      items={unique.map((img, i) => ({
        src: img.src,
        alt: ownAlt(img.alt)
          ? img.alt.trim()
          : `${name}, photo ${i + 1} of ${unique.length}`,
        label: `Photo ${i + 1}`,
        className: "object-cover",
      }))}
    />
  );
}
