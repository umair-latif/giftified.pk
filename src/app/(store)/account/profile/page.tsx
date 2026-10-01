import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Page } from "@/components/ui/page";
import { AccountHeading } from "@/features/account/components/account-heading";
import {
  DeleteAccountForm,
  PasswordLinkForm,
  ProfileForm,
} from "@/features/account/components/account-forms";
import { signOutAction } from "@/features/auth/actions";
import { getSessionCustomer } from "@/server/auth/cookies";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Profile and settings",
  robots: { index: false, follow: false },
};

/** Task 21: name, email, marketing preference, password, sign out, delete account. */
export default async function ProfilePage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/sign-in?next=/account/profile");
  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <AccountHeading title="Profile and settings" />
      <ProfileForm
        initial={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          marketingOptIn: customer.marketingOptIn === true,
        }}
      />
      <PasswordLinkForm email={customer.email} />
      <form action={signOutAction}>
        <button type="submit" className={buttonClass("secondary")}>
          Sign out
        </button>
      </form>
      <DeleteAccountForm />
    </Page>
  );
}
