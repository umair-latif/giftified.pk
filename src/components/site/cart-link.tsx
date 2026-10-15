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
      className="text-ink hover:bg-soft active:bg-soft relative grid size-11 place-items-center rounded-full"
      data-testid="cart-link"
    >
      <BagIcon />
      {count > 0 && (
        <span
          className="bg-highlight text-ink absolute top-1 right-0.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-semibold"
          data-testid="cart-count"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
