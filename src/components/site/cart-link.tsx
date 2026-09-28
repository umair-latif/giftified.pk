"use client";

import Link from "next/link";
import { useCartCount } from "@/features/cart/use-cart-count";
import { BagIcon } from "@/components/ui/icons";

/** Header cart button with a live item count. */
export function CartLink() {
  const count = useCartCount();
  return (
    <Link
      href="/cart"
      aria-label={
        count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"
      }
      className="text-ink active:bg-mint-100 relative grid size-11 place-items-center rounded-full"
      data-testid="cart-link"
    >
      <BagIcon />
      {count > 0 && (
        <span
          className="bg-magenta absolute top-1 right-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-semibold text-white"
          data-testid="cart-count"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
