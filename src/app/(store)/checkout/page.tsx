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
    <Page width="content" className="lg:max-w-5xl">
      <StepBar current="Order" inPage />
      <Link
        href="/cart"
        className="text-accent-text hover:text-deep rounded-xl text-sm font-semibold"
      >
        ← Back to cart
      </Link>
      <PageTitle className="mt-2 mb-4">Checkout</PageTitle>
      <CheckoutForm />
    </Page>
  );
}
