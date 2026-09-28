import type { Metadata } from "next";
import { RecentOrders } from "@/features/orders/components/recent-orders";
import { TrackForm } from "@/features/orders/components/track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Check your Giftified.pk order with your order number and mobile number.",
};

/** Guest order lookup: recent orders on this phone, then number + mobile. */
export default function TrackPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-ink text-2xl">Track your order</h1>
      <RecentOrders />
      <section aria-labelledby="find-order" className="flex flex-col gap-2">
        <h2 id="find-order" className="font-display text-ink text-lg">
          Find an order
        </h2>
        <p className="text-sm text-zinc-600">
          Enter the order number from your confirmation and the mobile number
          you ordered with.
        </p>
        <TrackForm />
      </section>
    </main>
  );
}
