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
          <p className="text-ink/70 text-sm">
            {hasToken
              ? "This link has expired or isn’t valid. Enter your email and we’ll send a new one."
              : "Enter your email and we’ll send you a link to choose a new password."}
          </p>
          <ForgotPasswordForm />
        </>
      )}
      <p className="text-ink/70 text-center text-sm">
        <Link
          href="/sign-in"
          className="text-accent-text hover:text-deep rounded-xl font-semibold"
        >
          Back to sign in
        </Link>
      </p>
    </Page>
  );
}
