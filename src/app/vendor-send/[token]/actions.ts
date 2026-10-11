"use server";

import { redirect } from "next/navigation";
import {
  handoffRecipient,
  readSendToken,
  sendToVendor,
  vendorDeps,
} from "@/server/vendors";

/** The Send button: emails the vendor, then shows the page again with the result. */
export async function sendToVendorAction(token: string): Promise<void> {
  const claims = readSendToken(token);
  if (!claims) redirect(`/vendor-send/${token}`);
  let ok = false;
  try {
    const replyTo = await handoffRecipient();
    const result = await sendToVendor(claims, {
      ...(await vendorDeps()),
      ...(replyTo ? { replyTo } : {}),
    });
    ok = result.ok;
    if (!result.ok) console.warn(`[vendor-send] ${result.message}`);
  } catch (err) {
    console.error("[vendor-send] failed", err);
  }
  redirect(`/vendor-send/${token}?${ok ? "sent=1" : "error=1"}`);
}
