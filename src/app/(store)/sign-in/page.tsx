import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getSessionCustomerId } from "@/server/auth/cookies";
import { googleConfigFromEnv } from "@/server/auth/google";
import { safeNextPath } from "@/server/auth/safe-next";
import { Page, PageTitle } from "@/components/ui/page";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Optional account: guest checkout keeps working without signing in. */
export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { next, error } = await props.searchParams;
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined;
  if (await getSessionCustomerId()) redirect(nextPath ?? "/account");
  const signUpHref = nextPath
    ? `/sign-up?next=${encodeURIComponent(nextPath)}`
    : "/sign-up";

  return (
    <Page width="narrow" className="flex flex-col gap-4">
      <PageTitle>Sign in</PageTitle>
      {error === "google" && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          We couldn’t sign you in with Google. Please try again or use your
          email.
        </p>
      )}
      {googleConfigFromEnv() && (
        <>
          <GoogleButton next={nextPath} />
          <p className="text-center text-sm text-zinc-500">
            or with your email
          </p>
        </>
      )}
      <SignInForm next={nextPath} />
      <p className="text-center text-sm text-zinc-600">
        New here?{" "}
        <Link href={signUpHref} className="text-brand-700 font-medium">
          Create an account
        </Link>
      </p>
      <p className="text-center text-sm text-zinc-500">
        You don’t need an account to order.{" "}
        <Link href="/products" className="underline">
          Keep shopping
        </Link>
      </p>
    </Page>
  );
}
