import { signToken, verifyToken } from "./token";

/** Stateless sign-in cookie: the WooCommerce customer ID, signed, 30 days. */
export const SESSION_TTL_S = 30 * 24 * 3600;
const PURPOSE = "session";

export function signSession(
  customerId: number,
  secret: string,
  nowS = Date.now() / 1000,
): string {
  return signToken(
    PURPOSE,
    { c: customerId, e: Math.floor(nowS + SESSION_TTL_S) },
    secret,
  );
}

/** The customer ID, or null for a missing, forged or expired cookie. */
export function verifySession(
  token: string | undefined,
  secret: string,
  nowS = Date.now() / 1000,
): number | null {
  if (!token) return null;
  const c = verifyToken(PURPOSE, token, secret, nowS);
  return c && Number.isInteger(c.c) && (c.c as number) > 0
    ? (c.c as number)
    : null;
}
