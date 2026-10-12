import "server-only";
import { getCommerce } from "@/lib/commerce";
import { getEmail } from "@/lib/email";
import { getStorage } from "@/lib/storage";
import { appBaseUrl, fileLinkSecret } from "@/server/files/links";
import { vendorsFromCatalog } from "./config";
import { SEND_LINK_TTL_S, signSendToken, verifySendToken } from "./handoff";
import type { VendorDeps } from "./send";

export * from "./send";

type Env = Record<string, string | undefined>;

/** Real dependencies: WooCommerce (orders + vendors from the products), R2, Resend. */
export async function vendorDeps(env: Env = process.env): Promise<VendorDeps> {
  const commerce = getCommerce();
  return {
    commerce,
    storage: getStorage(),
    email: getEmail(env),
    vendors: vendorsFromCatalog(await commerce.listProducts()),
    now: Date.now,
  };
}

/**
 * Who gets "Send to vendor" (and vendors' replies): VENDOR_HANDOFF_TO if set,
 * else the recipient of WooCommerce's "New order" email.
 */
export async function handoffRecipient(
  env: Env = process.env,
): Promise<string | null> {
  const override = env.VENDOR_HANDOFF_TO?.trim();
  if (override) return override;
  try {
    return await getCommerce().getNewOrderRecipient();
  } catch (err) {
    console.warn(
      `[vendor] couldn't read the New order email recipient: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/** The send page for one order + vendor (signed, 30 days). */
export function sendPageUrl(
  orderId: number,
  vendorId: string,
  env: Env = process.env,
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
