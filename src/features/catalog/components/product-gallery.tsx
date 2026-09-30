import { ImageGallery } from "@/components/ui/image-gallery";
import type { CatalogImage } from "@/lib/commerce/types";

/** The product's WooCommerce photos in the same gallery as design products. */
export function ProductGallery({
  images,
  name,
}: {
  images: CatalogImage[];
  name: string;
}) {
  return (
    <ImageGallery
      testId="product"
      items={images.map((img, i) => ({
        src: img.src,
        alt: img.alt || `${name}, photo ${i + 1}`,
        label: `Photo ${i + 1}`,
        className: "object-cover",
      }))}
    />
  );
}
