import Link from "next/link";
import type { ReactNode } from "react";
import { PageTitle } from "@/components/ui/page";

/** Top of every /account/* page: a link back to the account home, the title and an optional intro. */
export function AccountHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div>
      {/* Phones only: on desktop the account menu is always beside the page. */}
      <Link
        href="/account"
        className="focus-visible:ring-brand-600/20 mb-1 inline-block rounded text-sm text-zinc-600 underline focus-visible:ring-2 focus-visible:outline-none lg:hidden"
      >
        ← Your account
      </Link>
      <PageTitle>{title}</PageTitle>
      {children && <p className="mt-1 text-sm text-zinc-600">{children}</p>}
    </div>
  );
}
