"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductConfig } from "@/config/products";
import { useCart } from "@/features/cart/cart";
import { DesignEditor } from "./design-editor";

/**
 * `/design/<product>` edits the product's draft; `?item=<cart line id>` edits
 * that cart line's design instead.
 */
export function EditorEntry({ product }: { product: ProductConfig }) {
  const itemId = useSearchParams().get("item");
  const cart = useCart();
  if (!itemId) return <DesignEditor product={product} />;
  if (cart === null) return null; // reading the cart after mount
  const item = cart.find((i) => i.id === itemId && i.productId === product.id);
  if (!item) return <MissingItem />;
  return <DesignEditor key={item.designKey} product={product} item={item} />;
}

export function MissingItem() {
  return (
    <main className="mx-auto max-w-md p-6 text-sm" data-testid="missing-item">
      <p className="text-zinc-700">This design is no longer in your cart.</p>
      <Link
        href="/cart"
        className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 focus-visible:ring-brand-600/40 mt-4 inline-flex h-11 items-center rounded-full px-5 font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
      >
        Go to cart
      </Link>
    </main>
  );
}
