import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { DesignsSection } from "@/features/account/components/sections";
import { getSessionCustomerId } from "@/server/auth/cookies";

export const metadata: Metadata = {
  title: "My designs",
  robots: { index: false, follow: false },
};

/** Task 22: the customer's saved designs — continue on any device, rename, delete. */
export default async function SavedDesignsPage() {
  const customerId = await getSessionCustomerId();
  if (!customerId) redirect("/sign-in?next=/account/designs");
  return (
    <>
      <AccountHeading title="My designs">
        Tap a design to keep working on it, on this device or any other. Designs
        from orders you place while signed in are added here too.
      </AccountHeading>
      <DesignsSection customerId={customerId} />
    </>
  );
}
