"use server";

import { redirect } from "next/navigation";
import {
  handoffRecipient,
  readSendToken,
  sendToVendor,
  vendorDeps,
} from "@/server/vendors";

/** A plain address check: the real test is whether the vendor replies. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The Send button: emails the vendor, then shows the page again with the
 * result. `to` is only filled in when the product has no `vendor_email` in
 * WP admin, and the page asked for one.
 */
export async function sendToVendorAction(
  token: string,
  form?: FormData,
): Promise<void> {
  const claims = readSendToken(token);
  if (!claims) redirect(`/vendor-send/${token}`);
  const typed = form?.get("to");
  const to = typeof typed === "string" ? typed.trim() : "";
  if (to && !EMAIL.test(to)) redirect(`/vendor-send/${token}?noemail=1`);
  let ok = false;
  try {
    const replyTo = await handoffRecipient();
    const result = await sendToVendor(claims, {
      ...(await vendorDeps()),
      ...(replyTo ? { replyTo } : {}),
      ...(to ? { to } : {}),
    });
    ok = result.ok;
    if (!result.ok) console.warn(`[vendor-send] ${result.message}`);
  } catch (err) {
    console.error("[vendor-send] failed", err);
  }
  redirect(`/vendor-send/${token}?${ok ? "sent=1" : "error=1"}`);
}
