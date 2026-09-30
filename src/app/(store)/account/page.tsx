import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import { getSessionCustomer } from "@/server/auth/cookies";
import { Page, PageTitle } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

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
          className={buttonClass("secondary")}
          data-testid="sign-out"
        >
          Sign out
        </button>
      </form>
    </Page>
  );
}
