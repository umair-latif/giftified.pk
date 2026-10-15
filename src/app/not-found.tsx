import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Page, PageTitle } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

const button = buttonClass("primary");
const secondary =
  "text-accent-text hover:text-deep inline-flex h-12 items-center rounded-full px-4 font-semibold underline ";

/** Any unknown address: the normal shop shell instead of the bare framework page. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="flex-1">
        <Page width="narrow" className="flex flex-col gap-4 text-center">
          <p className="type-display text-deep">404</p>
          <PageTitle>We can’t find that page</PageTitle>
          <p className="text-ink">
            The link may be old or mistyped. Start from the shop, or check on an
            order you have placed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/products" className={button}>
              See products
            </Link>
            <Link href="/track" className={secondary}>
              Track your order
            </Link>
          </div>
        </Page>
      </div>
      <SiteFooter />
    </div>
  );
}
