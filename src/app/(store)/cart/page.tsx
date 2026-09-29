import type { Metadata } from "next";
import { CartView } from "@/features/cart/components/cart-view";
import { Page, PageTitle } from "@/components/ui/page";
import { StepBar } from "@/components/ui/step-bar";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <Page width="content">
      <StepBar current="Order" inPage />
      <PageTitle>Your cart</PageTitle>
      <CartView />
    </Page>
  );
}
