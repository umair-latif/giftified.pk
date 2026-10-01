import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Page, PageTitle } from "@/components/ui/page";
import { formatDate, orderStatusLabel } from "@/features/account/format";
import { signOutAction } from "@/features/auth/actions";
import { getCommerce } from "@/lib/commerce";
import { getSessionCustomer } from "@/server/auth/cookies";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

const SECTIONS = [
  {
    href: "/account/orders",
    label: "My orders",
    testId: "account-orders-link",
  },
  {
    href: "/account/designs",
    label: "My designs",
    testId: "account-designs-link",
  },
  {
    href: "/account/addresses",
    label: "Delivery address",
    testId: "account-addresses-link",
  },
  {
    href: "/account/profile",
    label: "Profile and settings",
    testId: "account-profile-link",
  },
] as const;

/** Account home (task 21): who is signed in, the latest order, and the account sections. */
export default async function AccountPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/sign-in?next=/account");
  const name = `${customer.firstName} ${customer.lastName}`.trim();
  const latest = await getCommerce()
    .listCustomerOrders(customer.id, 1)
    .then((r) => r.orders[0] ?? null)
    .catch((err: unknown) => {
      console.error("[account] latest order failed", err);
      return null; // the rest of the page still works
    });

  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <PageTitle>Your account</PageTitle>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
        {name && (
          <p className="text-ink font-medium" data-testid="account-name">
            {name}
          </p>
        )}
        <p className="text-sm text-zinc-600" data-testid="account-email">
          {customer.email}
        </p>
      </section>

      {latest && (
        <Link
          href={`/account/orders/${latest.id}`}
          className="focus-visible:ring-brand-600/20 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none"
          data-testid="account-latest-order"
        >
          <span>
            <span className="block text-sm text-zinc-500">Latest order</span>
            <span className="text-ink font-medium">Order #{latest.id}</span>
            <span className="block text-sm text-zinc-500">
              {formatDate(latest.createdAt)}
            </span>
          </span>
          <span className="bg-mint-100 text-brand-900 rounded-full px-3 py-1 text-sm font-medium">
            {orderStatusLabel(latest)}
          </span>
        </Link>
      )}

      <nav aria-label="Account">
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="text-ink focus-visible:ring-brand-600/20 flex h-12 items-center justify-between px-4 font-medium hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset active:bg-zinc-50"
                data-testid={s.testId}
              >
                {s.label}
                <span aria-hidden className="text-zinc-400">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form action={signOutAction}>
        <button
          type="submit"
          className={buttonClass("secondary")}
          data-testid="sign-out"
        >
          Sign out
        </button>
      </form>
    </Page>
  );
}
