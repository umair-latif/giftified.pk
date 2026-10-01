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
      <Link
        href="/account"
        className="focus-visible:ring-brand-600/20 rounded text-sm text-zinc-600 underline focus-visible:ring-2 focus-visible:outline-none"
      >
        Your account
      </Link>
      <PageTitle className="mt-1">{title}</PageTitle>
      {children && <p className="mt-1 text-sm text-zinc-600">{children}</p>}
    </div>
  );
}
