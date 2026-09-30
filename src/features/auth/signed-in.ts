"use client";

import { useSyncExternalStore } from "react";

/** Same name as `SIGNED_IN_COOKIE` in server/auth/cookies.ts (that file is server-only). */
export const SIGNED_IN_COOKIE = "giftified_signed_in";

const noop = () => () => {};
const read = () =>
  document.cookie.split("; ").some((c) => c === `${SIGNED_IN_COOKIE}=1`);

/**
 * Whether someone is signed in, from the readable marker cookie (no identity
 * in it). False on the server and before hydration, so pages stay static.
 */
export function useSignedIn(): boolean {
  return useSyncExternalStore(noop, read, () => false);
}
