import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { AddressSection } from "@/features/account/components/sections";
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
    <>
      <AccountHeading title="Delivery address">
        We fill this in at checkout. You can still send an order somewhere else,
        like a gift.
      </AccountHeading>
      <div className="max-w-xl">
        <AddressSection customer={customer} />
      </div>
    </>
  );
}
