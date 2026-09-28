import type { Metadata } from "next";
import { CartView } from "@/features/cart/components/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-5">
      <h1 className="text-ink text-2xl">Your cart</h1>
      <CartView />
    </main>
  );
}
