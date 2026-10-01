import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { OrderAgainButton } from "@/features/account/components/order-again-button";
import { formatDate } from "@/features/account/format";
import { OrderSummary } from "@/features/orders/components/order-summary";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { toOrderView } from "@/features/orders/order-view";
import { getCommerce } from "@/lib/commerce";
import { getSessionCustomerId } from "@/server/auth/cookies";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

/** Task 21: one of the customer's orders — the same timeline as /order/<id>, plus Order again. */
export default async function AccountOrderPage(
  props: PageProps<"/account/orders/[id]">,
) {
  const { id } = await props.params;
  const customerId = await getSessionCustomerId();
  if (!customerId)
    redirect(`/sign-in?next=/account/orders/${encodeURIComponent(id)}`);
  if (!/^\d{1,12}$/.test(id)) notFound();
  const order = await getCommerce().getCustomerOrder(customerId, Number(id));
  if (!order) notFound();
  const view = toOrderView(order);

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <AccountHeading title={`Order #${order.id}`}>
        Placed {formatDate(order.createdAt)}
      </AccountHeading>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
        <OrderTimeline steps={view.timeline} maskedPhone={view.maskedPhone} />
      </section>
      <OrderSummary view={view} />
      <OrderAgainButton
        orderId={order.id}
        lines={order.lines.map((l) => ({
          productId: l.productId,
          colourId: l.colourId,
          ...(l.size ? { size: l.size } : {}),
          quantity: l.quantity,
          designId: l.designId,
          ...(l.templateId ? { templateId: l.templateId } : {}),
        }))}
      />
    </div>
  );
}
