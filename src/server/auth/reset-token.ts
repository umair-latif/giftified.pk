import { signToken, verifyToken } from "./token";

/** Password-reset link lifetime. */
export const RESET_TTL_S = 3600;
const PURPOSE = "password-reset";

export interface ResetClaims {
  customerId: number;
  /** The customer's `modifiedAt` when the link was made: a password change invalidates it. */
  modifiedAt: string;
}

export function signResetToken(
  claims: ResetClaims,
  secret: string,
  nowS = Date.now() / 1000,
): string {
  return signToken(
    PURPOSE,
    {
      c: claims.customerId,
      m: claims.modifiedAt,
      e: Math.floor(nowS + RESET_TTL_S),
    },
    secret,
  );
}

export function verifyResetToken(
  token: string,
  secret: string,
  nowS = Date.now() / 1000,
): ResetClaims | null {
  const c = verifyToken(PURPOSE, token, secret, nowS);
  if (!c || !Number.isInteger(c.c) || typeof c.m !== "string") return null;
  return { customerId: c.c as number, modifiedAt: c.m };
}
