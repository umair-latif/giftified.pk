"use client";

import Link from "next/link";
import { UserIcon } from "@/components/ui/icons";
import { useSignedIn } from "@/features/auth/signed-in";

/**
 * Header account button. The cookie only says "someone is signed in", so the
 * header stays static and cacheable; false on the server and before hydration.
 */
export function AccountLink() {
  const isSignedIn = useSignedIn();
  return (
    <Link
      href={isSignedIn ? "/account" : "/sign-in"}
      aria-label={isSignedIn ? "Your account" : "Sign in"}
      className="text-ink hover:bg-soft active:bg-soft relative grid size-11 place-items-center rounded-full"
      data-testid="account-link"
    >
      <UserIcon />
      {isSignedIn && (
        <span className="bg-accent-text absolute right-2.5 bottom-2.5 size-2.5 rounded-full ring-2 ring-white" />
      )}
    </Link>
  );
}
