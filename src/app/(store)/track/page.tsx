import type { Metadata } from "next";
import { RecentOrders } from "@/features/orders/components/recent-orders";
import { TrackForm } from "@/features/orders/components/track-form";
import { Page, PageTitle } from "@/components/ui/page";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Check your DesignBanana order with your order number and mobile number.",
};

/** Guest order lookup: recent orders on this phone, then number + mobile. */
export default function TrackPage() {
  return (
    <Page width="content" className="flex flex-col gap-6">
      <PageTitle>Track your order</PageTitle>
      <RecentOrders />
      <section aria-labelledby="find-order" className="flex flex-col gap-2">
        <h2 id="find-order" className="type-card-title text-ink">
          Find an order
        </h2>
        <p className="text-ink/70 text-sm">
          Enter the order number from your confirmation and the mobile number
          you ordered with.
        </p>
        <TrackForm />
      </section>
    </Page>
  );
}
