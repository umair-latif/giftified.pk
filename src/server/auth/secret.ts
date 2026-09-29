import { createHmac } from "node:crypto";

/** Local dev and demo builds (COMMERCE_MOCK=1) have no secret; never used for a real store. */
const DEV_SECRET = "giftified-dev-auth-secret";

/**
 * Secret for session cookies, reset links and OAuth state: AUTH_SECRET, else
 * derived from WC_WEBHOOK_SECRET (one less setting). Empty in production
 * without either, so signing fails loudly instead of using a guessable key.
 */
export function authSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (env.WC_WEBHOOK_SECRET)
    return createHmac("sha256", env.WC_WEBHOOK_SECRET)
      .update("auth-secret")
      .digest("hex");
  if (env.NODE_ENV !== "production" || env.COMMERCE_MOCK === "1")
    return DEV_SECRET;
  return "";
}
