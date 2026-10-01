import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { OrdersSection } from "@/features/account/components/sections";
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
  return (
    <>
      <AccountHeading title="My orders">
        Orders you placed while signed in.
      </AccountHeading>
      <OrdersSection customerId={customerId} page={page} />
    </>
  );
}
