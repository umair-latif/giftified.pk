import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/features/auth/components/google-button";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { getSessionCustomerId } from "@/server/auth/cookies";
import { googleConfigFromEnv } from "@/server/auth/google";
import { safeNextPath } from "@/server/auth/safe-next";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function SignUpPage(props: PageProps<"/sign-up">) {
  const { next } = await props.searchParams;
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined;
  if (await getSessionCustomerId()) redirect(nextPath ?? "/account");
  const signInHref = nextPath
    ? `/sign-in?next=${encodeURIComponent(nextPath)}`
    : "/sign-in";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-ink text-2xl">Create an account</h1>
      <p className="text-sm text-zinc-600">
        Keep your orders and designs in one place. You can always order without
        an account too.
      </p>
      {googleConfigFromEnv() && (
        <>
          <GoogleButton next={nextPath} />
          <p className="text-center text-sm text-zinc-500">
            or with your email
          </p>
        </>
      )}
      <SignUpForm next={nextPath} />
      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link
          href={signInHref}
          className="text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 rounded font-medium"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
