import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/features/auth/actions";
import { getSessionCustomer } from "@/server/auth/cookies";

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
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-ink text-2xl">Your account</h1>
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
          className="text-ink h-12 w-full rounded-full border border-zinc-300 bg-white font-semibold hover:bg-zinc-50 active:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20"
          data-testid="sign-out"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
