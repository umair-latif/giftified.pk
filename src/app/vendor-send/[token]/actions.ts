"use server";

import { redirect } from "next/navigation";
import {
  readSendToken,
  sendToVendor,
  vendorDeps,
  vendorReplyTo,
} from "@/server/vendors";

/** The Send button: emails the vendor, then shows the page again with the result. */
export async function sendToVendorAction(token: string): Promise<void> {
  const claims = readSendToken(token);
  if (!claims) redirect(`/vendor-send/${token}`);
  const replyTo = vendorReplyTo();
  let ok = false;
  try {
    const result = await sendToVendor(claims, {
      ...vendorDeps(),
      ...(replyTo ? { replyTo } : {}),
    });
    ok = result.ok;
    if (!result.ok) console.warn(`[vendor-send] ${result.message}`);
  } catch (err) {
    console.error("[vendor-send] failed", err);
  }
  redirect(`/vendor-send/${token}?${ok ? "sent=1" : "error=1"}`);
}
