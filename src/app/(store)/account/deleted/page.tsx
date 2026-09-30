import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageTitle } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account deleted",
  robots: { index: false, follow: false },
};

/** Shown after "Delete my account" (task 21). */
export default function AccountDeletedPage() {
  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <PageTitle>Your account is deleted</PageTitle>
      <p className="text-ink" data-testid="account-deleted">
        We&apos;ve deleted your account, your saved designs and their photos.
        Records of past orders are kept for accounting, as our{" "}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>{" "}
        explains.
      </p>
      <Link href="/" className={buttonClass("primary")}>
        Back to the shop
      </Link>
    </Page>
  );
}
