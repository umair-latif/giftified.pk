import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { Page, PageTitle } from "@/components/ui/page";
import { StepBar } from "@/components/ui/step-bar";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

/** The whole cart → one Cash on Delivery order (guest; email optional). */
export default function CheckoutPage() {
  return (
    <Page width="content">
      <StepBar current="Order" inPage />
      <Link
        href="/cart"
        className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      >
        ← Back to cart
      </Link>
      <PageTitle className="mt-2 mb-4">Checkout</PageTitle>
      <CheckoutForm />
    </Page>
  );
}
