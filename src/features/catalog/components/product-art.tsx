import Image from "next/image";
import type { ProductId } from "@/config/products";

/**
 * Stand-in product picture until WooCommerce has photos (TODO(founder): upload
 * product photos in WP admin → Products → Gallery). It is the same placeholder
 * photo the home page shows, so a product looks the same everywhere.
 */
export function ProductArt({
  productId,
  className = "aspect-square",
}: {
  productId: ProductId;
  className?: string;
}) {
  return (
    <Image
      src={`/home/${productId}-placeholder.webp`}
      alt=""
      width={640}
      height={640}
      sizes="(max-width: 640px) 112px, 320px"
      className={`bg-mint-100 w-full object-cover ${className}`}
    />
  );
}
