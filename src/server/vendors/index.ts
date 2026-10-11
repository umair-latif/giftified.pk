import "server-only";
import { SITE } from "@/config/site";
import { getCommerce } from "@/lib/commerce";
import { getEmail } from "@/lib/email";
import { getStorage } from "@/lib/storage";
import { appBaseUrl, fileLinkSecret } from "@/server/files/links";
import { handoffRecipient, vendorsFromEnv } from "./config";
import { SEND_LINK_TTL_S, signSendToken, verifySendToken } from "./handoff";
import type { VendorDeps } from "./send";

export * from "./send";
export { handoffRecipient } from "./config";

/** Real dependencies: WooCommerce, R2, Resend and the vendors from env. */
export function vendorDeps(
  env: Record<string, string | undefined> = process.env,
): VendorDeps {
  return {
    commerce: getCommerce(),
    storage: getStorage(),
    email: getEmail(env),
    vendors: vendorsFromEnv(env),
    test: SITE.preview,
    now: Date.now,
  };
}

/** The send page for one order + vendor (signed, 30 days). */
export function sendPageUrl(
  orderId: number,
  vendorId: string,
  env: Record<string, string | undefined> = process.env,
  nowS = Date.now() / 1000,
): string {
  const token = signSendToken(
    { o: orderId, v: vendorId, e: Math.floor(nowS + SEND_LINK_TTL_S) },
    fileLinkSecret(env),
  );
  return `${appBaseUrl(env)}/vendor-send/${token}`;
}

export const readSendToken = (token: string) =>
  verifySendToken(token, fileLinkSecret());

/** Replies from vendors go to the admin. */
export const vendorReplyTo = () => handoffRecipient();
