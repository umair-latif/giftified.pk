import type { Metadata } from "next";
import Link from "next/link";
import {
  ForgotPasswordForm,
  NewPasswordForm,
} from "@/features/auth/components/reset-forms";
import { authSecret } from "@/server/auth/secret";
import { verifyResetToken } from "@/server/auth/reset-token";
import { Page, PageTitle } from "@/components/ui/page";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
  // The emailed link carries a secret token: keep it out of Referer headers.
  referrer: "no-referrer",
};

/** No token: ask for a link by email. With `?token=` from that email: choose a new password. */
export default async function ResetPasswordPage(
  props: PageProps<"/reset-password">,
) {
  const { token } = await props.searchParams;
  const hasToken = typeof token === "string" && token.length > 0;
  const valid = hasToken && verifyResetToken(token, authSecret()) !== null;

  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <PageTitle>
        {valid ? "Choose a new password" : "Reset your password"}
      </PageTitle>
      {valid ? (
        <NewPasswordForm token={token} />
      ) : (
        <>
          <p className="text-sm text-zinc-600">
            {hasToken
              ? "This link has expired or isn’t valid. Enter your email and we’ll send a new one."
              : "Enter your email and we’ll send you a link to choose a new password."}
          </p>
          <ForgotPasswordForm />
        </>
      )}
      <p className="text-center text-sm text-zinc-600">
        <Link
          href="/sign-in"
          className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 rounded font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </Page>
  );
}
