import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getCommerce, type Customer } from "@/lib/commerce";
import { authSecret } from "./secret";
import { SESSION_TTL_S, signSession, verifySession } from "./session";

export const SESSION_COOKIE = "giftified_session";
/** Readable by the header script: only says "someone is signed in" (no identity). */
export const SIGNED_IN_COOKIE = "giftified_signed_in";

const secure = () => process.env.NODE_ENV === "production";

export async function startSession(customerId: number): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(customerId, authSecret()), {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  jar.set(SIGNED_IN_COOKIE, "1", {
    httpOnly: false,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(SIGNED_IN_COOKIE);
}

/** The signed-in customer's ID from the cookie, or null. Never throws. */
export async function getSessionCustomerId(): Promise<number | null> {
  try {
    const jar = await cookies();
    return verifySession(jar.get(SESSION_COOKIE)?.value, authSecret());
  } catch {
    return null; // outside a request (tests, scripts)
  }
}

/**
 * The signed-in customer, or null (not signed in, or the account was deleted).
 * Cached per request: the account layout and its page both ask.
 */
export const getSessionCustomer = cache(async (): Promise<Customer | null> => {
  const id = await getSessionCustomerId();
  return id ? getCommerce().getCustomer(id) : null;
});
