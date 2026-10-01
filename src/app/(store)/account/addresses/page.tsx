import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Page } from "@/components/ui/page";
import { AccountHeading } from "@/features/account/components/account-heading";
import { AddressForm } from "@/features/account/components/account-forms";
import { getSessionCustomer } from "@/server/auth/cookies";

export const metadata: Metadata = {
  title: "Delivery address",
  robots: { index: false, follow: false },
};

/** Task 21: the default delivery address (fills checkout). */
export default async function AddressesPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/sign-in?next=/account/addresses");
  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <AccountHeading title="Delivery address">
        We fill this in at checkout. You can still send an order somewhere else,
        like a gift.
      </AccountHeading>
      <AddressForm
        initial={{
          ...(customer.phone ? { phone: customer.phone } : {}),
          ...(customer.address
            ? {
                city: customer.address.city,
                addressLine: customer.address.addressLine,
                ...(customer.address.landmark
                  ? { landmark: customer.address.landmark }
                  : {}),
              }
            : {}),
        }}
      />
    </Page>
  );
}
