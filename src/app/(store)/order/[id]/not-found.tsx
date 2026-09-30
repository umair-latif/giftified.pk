import Link from "next/link";
import { Page, PageTitle } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

/**
 * Shown for a missing or wrong order link. Deliberately the same for "no such
 * order" and "wrong token", so it reveals nothing about which orders exist.
 */
export default function OrderNotFound() {
  return (
    <Page width="content" className="flex flex-col gap-4 text-center">
      <PageTitle>We can’t open this order link</PageTitle>
      <p className="text-zinc-700">
        The link may be incomplete. Find your order with its number and your
        mobile number instead.
      </p>
      <Link href="/track" className={buttonClass("primary")}>
        Track your order
      </Link>
    </Page>
  );
}
