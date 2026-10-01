import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountHeading } from "@/features/account/components/account-heading";
import { ProfileSection } from "@/features/account/components/sections";
import { SignOutButton } from "@/features/account/components/sign-out-button";
import { getSessionCustomer } from "@/server/auth/cookies";

export const metadata: Metadata = {
  title: "Profile and settings",
  robots: { index: false, follow: false },
};

/** Task 21: name, email, marketing preference, password, delete account. */
export default async function ProfilePage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/sign-in?next=/account/profile");
  return (
    <>
      <AccountHeading title="Profile and settings" />
      <div className="flex max-w-xl flex-col gap-4">
        <ProfileSection customer={customer} />
        {/* Desktop has Sign out under the menu. */}
        <SignOutButton className="lg:hidden" />
      </div>
    </>
  );
}
