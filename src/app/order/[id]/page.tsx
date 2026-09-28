import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppHeader } from "@/components/ui/app-header";
import { StepBar } from "@/components/ui/step-bar";
import { getProduct } from "@/config/products";
import { formatPkr } from "@/features/checkout/format";
import { getCommerce } from "@/lib/commerce";
import { maskPkMobile } from "@/lib/phone";

export const metadata: Metadata = { title: "Order placed" };

/** Confirmation after checkout. Always rendered per request (status can change). */
export default async function OrderConfirmationPage(
  props: PageProps<"/order/[id]">,
) {
  await connection();
  const { id } = await props.params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  const order = await getCommerce().getOrder(Number(id));
  if (!order) notFound();

  return (
    <div className="bg-cream min-h-dvh">
      <AppHeader title="Order placed" backHref="/" backLabel="Home" />
      <StepBar current="Order" />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-8">
        <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
          <p className="text-lg font-semibold text-zinc-900">Thank you!</p>
          <p
            className="mt-1 text-sm text-zinc-700"
            data-testid="confirm-message"
          >
            We’ll call or message you on{" "}
            <span className="font-medium whitespace-nowrap">
              {maskPkMobile(order.customer.phone)}
            </span>{" "}
            to confirm your order before we print it.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Order number{" "}
            <span
              className="font-semibold text-zinc-900"
              data-testid="order-number"
            >
              #{order.id}
            </span>
          </p>
        </section>
        <dl className="grid grid-cols-2 gap-y-1 rounded-lg bg-white p-4 text-sm ring-1 ring-zinc-200">
          {order.lines.map((line, i) => (
            <div key={i} className="contents">
              <dt className="text-zinc-500">
                {getProduct(line.productId)?.name ?? line.productId}
              </dt>
              <dd className="text-right">
                {line.quantity} × {formatPkr(line.unitPricePkr)}
              </dd>
            </div>
          ))}
          <dt className="text-zinc-500">Delivery to {order.customer.city}</dt>
          <dd className="text-right">{formatPkr(order.shippingPkr)}</dd>
          <dt className="font-semibold">Pay on delivery</dt>
          <dd className="text-right font-semibold" data-testid="order-total">
            {formatPkr(order.totalPkr)}
          </dd>
        </dl>
        <Link
          href="/"
          className="bg-brand-600 active:bg-brand-700 grid h-12 place-items-center rounded-full font-semibold text-white"
        >
          Back to the shop
        </Link>
      </main>
    </div>
  );
}
