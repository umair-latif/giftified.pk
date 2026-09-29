import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import { getSessionCustomer } from "@/server/auth/cookies";
import { Page, PageTitle } from "@/components/ui/page";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/** Minimal account home (task 20). Orders, designs and addresses arrive with task 21. */
export default async function AccountPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/sign-in?next=/account");
  const name = `${customer.firstName} ${customer.lastName}`.trim();

  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <PageTitle>Your account</PageTitle>
      <section className="rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        {name && (
          <p className="text-ink font-medium" data-testid="account-name">
            {name}
          </p>
        )}
        <p className="text-sm text-zinc-600" data-testid="account-email">
          {customer.email}
        </p>
      </section>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-ink focus-visible:ring-brand-600/20 h-12 w-full rounded-full border border-zinc-300 bg-white font-semibold hover:bg-zinc-50 focus-visible:ring-2 focus-visible:outline-none active:bg-zinc-50"
          data-testid="sign-out"
        >
          Sign out
        </button>
      </form>
    </Page>
  );
}
