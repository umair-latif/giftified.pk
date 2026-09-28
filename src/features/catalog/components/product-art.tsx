import type { ProductId } from "@/config/products";

/**
 * Simple line drawings used until WooCommerce has product photos
 * (TODO(founder): upload product photos in WP admin → Products → Gallery).
 * Inline SVG: no request, no layout shift.
 */
export function ProductArt({
  productId,
  className = "",
}: {
  productId: ProductId;
  className?: string;
}) {
  return (
    <div
      className={`bg-mint-100 grid aspect-square place-items-center ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        className="text-brand-600 h-3/5 w-3/5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {productId === "mug" ? (
          <>
            <path
              d="M24 30h58v56a12 12 0 0 1-12 12H36a12 12 0 0 1-12-12z"
              fill="#fff"
            />
            <path d="M82 44h8a12 12 0 0 1 0 24h-8" />
            <path
              d="M36 52c6-8 16-8 22 0s16 8 22 0"
              className="text-magenta"
              stroke="currentColor"
            />
          </>
        ) : productId === "tshirt" ? (
          <path
            d="M44 18c4 7 28 7 32 0l24 12-8 18-12-5v57H40V43l-12 5-8-18z"
            fill="#fff"
          />
        ) : (
          <>
            <path
              d="M42 24c0-8 36-8 36 0l22 12-8 20-10-4v54H38V52l-10 4-8-20z"
              fill="#fff"
            />
            <path d="M46 26c4 12 24 12 28 0M50 84h20v12H50zM56 38v10M64 38v10" />
          </>
        )}
      </svg>
    </div>
  );
}
