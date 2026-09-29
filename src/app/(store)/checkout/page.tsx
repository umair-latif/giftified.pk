import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

/** The whole cart → one Cash on Delivery order (guest; email optional). */
export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-5">
      <Link href="/cart" className="text-brand-700 text-sm font-medium">
        ← Back to cart
      </Link>
      <h1 className="font-display text-ink mt-2 mb-4 text-2xl">Checkout</h1>
      <CheckoutForm />
    </main>
  );
}
