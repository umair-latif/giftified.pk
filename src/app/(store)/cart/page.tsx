import type { Metadata } from "next";
import { CartView } from "@/features/cart/components/cart-view";
import { Page, PageTitle } from "@/components/ui/page";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <Page width="content">
      <PageTitle>Your cart</PageTitle>
      <CartView />
    </Page>
  );
}
