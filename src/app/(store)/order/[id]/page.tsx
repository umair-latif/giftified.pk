import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { formatPkr } from "@/features/checkout/format";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { RememberOrder } from "@/features/orders/components/remember-order";
import { loadOrderForLink } from "@/features/orders/order-access";
import { toOrderView } from "@/features/orders/order-view";
import { getCommerce } from "@/lib/commerce";

export const metadata: Metadata = {
  title: "Your order",
  // Private link: keep it out of search engines and out of Referer headers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Order status, opened from the private link `/order/<id>?t=<token>` (after
 * checkout, from /track or from "recent orders"). Without a valid token → 404,
 * so an order can't be opened by guessing its number. Rendered per request.
 */
export default async function OrderStatusPage(props: PageProps<"/order/[id]">) {
  await connection();
  const [{ id }, { t }] = await Promise.all([props.params, props.searchParams]);
  const order = await loadOrderForLink(id, t, getCommerce());
  if (!order || typeof t !== "string") notFound();
  const view = toOrderView(order);
  const justPlaced = view.status === "on-hold";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <RememberOrder id={view.id} t={t} createdAt={view.createdAt} />
      <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        <h1 className="font-display text-ink text-2xl">
          {justPlaced ? "Thank you!" : "Your order"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Order number{" "}
          <span
            className="font-semibold text-zinc-900"
            data-testid="order-number"
          >
            #{view.id}
          </span>
        </p>
        <div className="mt-4">
          <OrderTimeline steps={view.timeline} maskedPhone={view.maskedPhone} />
        </div>
      </section>

      <section
        aria-label="Order summary"
        className="rounded-lg bg-white p-4 ring-1 ring-zinc-200"
      >
        <ul className="divide-y divide-zinc-100">
          {view.lines.map((line, i) => (
            <li
              key={i}
              className="flex justify-between gap-3 py-2 text-sm first:pt-0"
              data-testid="order-line"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">{line.name}</p>
                <p className="text-zinc-500">
                  {line.variant ? `${line.variant} · ` : ""}Qty {line.quantity}{" "}
                  × {formatPkr(line.unitPricePkr)}
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {formatPkr(line.lineTotalPkr)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 border-t border-zinc-200 pt-2 text-sm">
          <dt className="text-zinc-500">Delivery to {view.city}</dt>
          <dd className="text-right">{formatPkr(view.shippingPkr)}</dd>
          <dt className="font-semibold">
            {view.status === "completed"
              ? "Paid on delivery"
              : "Pay on delivery"}
          </dt>
          <dd className="text-right font-semibold" data-testid="order-total">
            {formatPkr(view.totalPkr)}
          </dd>
        </dl>
      </section>

      <p className="text-center text-sm text-zinc-600">
        Keep this page’s link to check your order later, or find it any time on{" "}
        <Link href="/track" className="text-brand-700 font-medium underline">
          Track your order
        </Link>
        .
      </p>
      <Link
        href="/"
        className="bg-brand-600 active:bg-brand-700 grid h-12 place-items-center rounded-full font-semibold text-white"
      >
        Back to the shop
      </Link>
    </main>
  );
}
