import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Page } from "@/components/ui/page";
import { AccountHeading } from "@/features/account/components/account-heading";
import { formatDate, orderStatusLabel } from "@/features/account/format";
import { formatPkr } from "@/features/checkout/format";
import { getCommerce } from "@/lib/commerce";
import { getSessionCustomerId } from "@/server/auth/cookies";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

/** Task 21: orders placed while signed in, newest first, 20 per page. */
export default async function AccountOrdersPage(
  props: PageProps<"/account/orders">,
) {
  const customerId = await getSessionCustomerId();
  if (!customerId) redirect("/sign-in?next=/account/orders");
  const { page: raw } = await props.searchParams;
  const n = Number(typeof raw === "string" ? raw : "1");
  const page = Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
  const { orders, totalPages } = await getCommerce().listCustomerOrders(
    customerId,
    page,
  );

  return (
    <Page width="content" className="flex flex-col gap-4">
      <AccountHeading title="My orders">
        Orders you placed while signed in. Orders placed as a guest are on{" "}
        <Link href="/track" className="underline">
          Track your order
        </Link>
        .
      </AccountHeading>
      {orders.length === 0 ? (
        <section
          className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200"
          data-testid="account-orders-empty"
        >
          <p className="text-ink">No orders yet.</p>
          <Link
            href="/products"
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-700 mt-3 inline-flex h-12 items-center rounded-full px-5 font-semibold text-white"
          >
            Browse products
          </Link>
        </section>
      ) : (
        <ul
          className="divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200"
          data-testid="account-orders"
        >
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="focus-visible:ring-brand-600/20 flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:bg-zinc-50"
                data-testid="account-order"
              >
                <span className="min-w-0">
                  <span className="text-ink block font-medium">
                    Order #{o.id}
                  </span>
                  <span className="block text-sm text-zinc-500">
                    {formatDate(o.createdAt)} ·{" "}
                    {o.lines.reduce((s, l) => s + l.quantity, 0)} item(s) ·{" "}
                    {formatPkr(o.totalPkr)}
                  </span>
                </span>
                <span className="bg-mint-100 text-brand-900 shrink-0 rounded-full px-3 py-1 text-sm font-medium">
                  {orderStatusLabel(o)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <nav aria-label="Pages" className="flex justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/account/orders?page=${page - 1}`}
              className="text-ink inline-flex h-11 items-center rounded-full border border-zinc-300 bg-white px-4"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages && (
            <Link
              href={`/account/orders?page=${page + 1}`}
              className="text-ink inline-flex h-11 items-center rounded-full border border-zinc-300 bg-white px-4"
            >
              Older →
            </Link>
          )}
        </nav>
      )}
    </Page>
  );
}
