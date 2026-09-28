import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Long-lived, unguessable download links for print files, e.g. for the order
 * note in WP admin: https://app/api/files/<token>. The token is signed, so it
 * can't be altered to reach another file; the route turns it into a
 * 5-minute storage link. Files themselves stay private.
 */
export interface FileLinkClaims {
  /** Storage key. */
  k: string;
  /** Download file name. */
  n: string;
  /** Expiry, seconds since epoch. */
  e: number;
}

export const FILE_LINK_TTL_S = 90 * 24 * 3600;

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(payload: string, secret: string): string {
  return b64url(
    createHmac("sha256", secret).update(`files-link:${payload}`).digest(),
  );
}

export function signFileToken(claims: FileLinkClaims, secret: string): string {
  if (!secret) throw new Error("File link secret is empty");
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the claims, or null if the token is forged, malformed or expired. */
export function verifyFileToken(
  token: string,
  secret: string,
  nowS = Date.now() / 1000,
): FileLinkClaims | null {
  if (!secret) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  try {
    const c = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<FileLinkClaims>;
    if (
      typeof c.k !== "string" ||
      typeof c.n !== "string" ||
      typeof c.e !== "number"
    )
      return null;
    if (c.e < nowS) return null;
    return { k: c.k, n: c.n, e: c.e };
  } catch {
    return null;
  }
}

/** Secret for file links: FILES_LINK_SECRET, else derived from WC_WEBHOOK_SECRET (one less setting). */
export function fileLinkSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.FILES_LINK_SECRET) return env.FILES_LINK_SECRET;
  if (env.WC_WEBHOOK_SECRET)
    return createHmac("sha256", env.WC_WEBHOOK_SECRET)
      .update("files-link-secret")
      .digest("hex");
  return "";
}

/** Public base URL of the app (Vercel sets VERCEL_PROJECT_PRODUCTION_URL, e.g. giftified.microw.me). */
export function appBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function fileLinkUrl(
  key: string,
  downloadName: string,
  env: Record<string, string | undefined> = process.env,
  nowS = Date.now() / 1000,
): string {
  const token = signFileToken(
    { k: key, n: downloadName, e: Math.floor(nowS + FILE_LINK_TTL_S) },
    fileLinkSecret(env),
  );
  return `${appBaseUrl(env)}/api/files/${token}`;
}
