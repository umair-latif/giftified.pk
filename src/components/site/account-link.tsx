"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { UserIcon } from "@/components/ui/icons";

/** Same name as `SIGNED_IN_COOKIE` in server/auth/cookies.ts (that file is server-only). */
const SIGNED_IN_COOKIE = "giftified_signed_in";

const noop = () => () => {};
const signedIn = () =>
  document.cookie.split("; ").some((c) => c === `${SIGNED_IN_COOKIE}=1`);

/**
 * Header account button. The cookie only says "someone is signed in", so the
 * header stays static and cacheable; false on the server and before hydration.
 */
export function AccountLink() {
  const isSignedIn = useSyncExternalStore(noop, signedIn, () => false);
  return (
    <Link
      href={isSignedIn ? "/account" : "/sign-in"}
      aria-label={isSignedIn ? "Your account" : "Sign in"}
      className="text-ink hover:bg-mint-100 active:bg-mint-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 relative grid size-11 place-items-center rounded-full"
      data-testid="account-link"
    >
      <UserIcon />
      {isSignedIn && (
        <span className="bg-brand-600 absolute right-2.5 bottom-2.5 size-2.5 rounded-full ring-2 ring-white" />
      )}
    </Link>
  );
}
