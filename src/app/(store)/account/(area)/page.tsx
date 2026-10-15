import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { PageTitle } from "@/components/ui/page";
import { Disclosure } from "@/components/ui/disclosure";
import { formatDate, orderStatusLabel } from "@/features/account/format";
import {
  AddressSection,
  card,
  DesignsSection,
  OrdersSection,
  ProfileSection,
  SectionLoading,
  StatusPill,
} from "@/features/account/components/sections";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import { getCommerce } from "@/lib/commerce";
import { getSessionCustomer } from "@/server/auth/cookies";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/**
 * Account home (task 21). Everyone: who is signed in and the latest order.
 * Phones: every section opens and closes as a card right here (no page
 * change). Desktop: the menu on the left opens each section on the right.
 */
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
    <>
      <PageTitle>
        {name ? `Hi, ${customer.firstName}` : "Your account"}
      </PageTitle>
      <section className={`p-4 ${card} lg:hidden`}>
        {name && (
          <p className="text-ink font-semibold" data-testid="account-name">
            {name}
          </p>
        )}
        <p className="text-ink/70 text-sm" data-testid="account-email">
          {customer.email}
        </p>
      </section>

      {latest ? (
        <Link
          href={`/account/orders/${latest.id}`}
          className={`hover:bg-soft flex items-center justify-between gap-3 p-4 transition-colors ${card}`}
          data-testid="account-latest-order"
        >
          <span>
            <span className="text-ink/65 block text-sm">Latest order</span>
            <span className="text-ink font-semibold">Order #{latest.id}</span>
            <span className="text-ink/65 block text-sm">
              {formatDate(latest.createdAt)}
            </span>
          </span>
          <StatusPill>{orderStatusLabel(latest)}</StatusPill>
        </Link>
      ) : (
        <p className={`text-ink/70 hidden p-4 lg:block ${card}`}>
          No orders yet. When you order while signed in, you can follow it here.
        </p>
      )}

      <p className="text-ink/70 hidden text-sm lg:block">
        Choose a section on the left to see your orders, saved designs, delivery
        address or settings.
      </p>

      {/* Phones: the sections open in place. */}
      <div className="flex flex-col gap-3 lg:hidden">
        <Section id="orders" title="My orders">
          <Suspense fallback={<SectionLoading />}>
            <OrdersSection customerId={customer.id} limit={5} framed={false} />
          </Suspense>
        </Section>
        <Section id="designs" title="My designs">
          <Suspense fallback={<SectionLoading />}>
            <DesignsSection customerId={customer.id} />
          </Suspense>
        </Section>
        <Section id="addresses" title="Delivery address">
          <AddressSection customer={customer} framed={false} />
        </Section>
        <Section id="profile" title="Profile and settings">
          <ProfileSection customer={customer} framed={false} />
        </Section>
        <SignOutButton className="mt-2" />
      </div>
    </>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Disclosure
      id={id}
      summary={title}
      className={`overflow-hidden ${card}`}
      summaryClassName="font-semibold transition-colors"
      bodyClassName="pt-1"
    >
      <div data-testid={`account-section-${id}`}>{children}</div>
    </Disclosure>
  );
}
