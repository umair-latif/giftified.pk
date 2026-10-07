import { Page } from "@/components/ui/page";
import { AccountNav } from "@/features/account/components/account-nav";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import { getSessionCustomer } from "@/server/auth/cookies";

/**
 * Account area shell (task 21): the same wide column as the header and the
 * other shop pages. Desktop: menu on the left, the chosen section on the
 * right (only that side changes). Phone: one column; the account home opens
 * each section as a card in place.
 */
export default async function AccountLayout({
  children,
}: LayoutProps<"/account">) {
  const customer = await getSessionCustomer();
  // Signed out: each page redirects to sign-in with the right ?next=.
  if (!customer) return children;
  const name = `${customer.firstName} ${customer.lastName}`.trim();
  return (
    <Page
      width="wide"
      className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10"
    >
      <aside className="sticky top-28 hidden flex-col gap-4 lg:flex">
        <div className="px-3">
          <p className="text-brand-900 font-display text-lg">
            {name || "Your account"}
          </p>
          <p className="truncate text-sm text-zinc-600">{customer.email}</p>
        </div>
        <AccountNav />
        <SignOutButton className="px-1" testId="sign-out-desktop" />
      </aside>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </Page>
  );
}
