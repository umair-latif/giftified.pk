import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Small signed tokens (HMAC-SHA256, no database): `<base64url json>.<signature>`.
 * The `purpose` is part of what is signed, so a session token can never be
 * used as a reset token or as an OAuth state, even though they share a secret.
 * Every token carries `e`, its expiry in seconds since epoch.
 */
export interface TokenClaims {
  e: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(purpose: string, payload: string, secret: string): string {
  return b64url(
    createHmac("sha256", secret).update(`${purpose}:${payload}`).digest(),
  );
}

export function signToken<T extends TokenClaims>(
  purpose: string,
  claims: T,
  secret: string,
): string {
  if (!secret) throw new Error("Auth secret is empty");
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  return `${payload}.${sign(purpose, payload, secret)}`;
}

/** The claims, or null when the token is forged, malformed or expired. */
export function verifyToken(
  purpose: string,
  token: string,
  secret: string,
  nowS = Date.now() / 1000,
): (Record<string, unknown> & TokenClaims) | null {
  if (!secret) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(purpose, payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  try {
    const c: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (typeof c !== "object" || c === null) return null;
    const claims = c as Record<string, unknown>;
    if (typeof claims.e !== "number" || claims.e < nowS) return null;
    return { ...claims, e: claims.e };
  } catch {
    return null;
  }
}
