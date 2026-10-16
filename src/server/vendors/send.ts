import type { CommerceClient } from "@/lib/commerce/types";
import type { EmailAttachment, EmailSender } from "@/lib/email/types";
import { printFileKey, proofFileKey, vendorSentKey } from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import type { Order, OrderId } from "@/types/order";
import type { Vendor } from "./config";
import {
  handoffEmail,
  splitByVendor,
  vendorMessage,
  vendorSubject,
  type SendClaims,
  type VendorPart,
} from "./handoff";

/**
 * Vendor hand-off with injected dependencies (the Inngest job, the send page
 * and the tests call the same code). Rule 7: only confirmed orders
 * (Processing) ever go to a vendor.
 */
export interface VendorDeps {
  commerce: Pick<CommerceClient, "getOrder" | "addOrderNote">;
  storage: Pick<ObjectStorage, "get" | "put">;
  email: EmailSender;
  /** From the products' vendor fields in WP admin (see config.ts). */
  vendors: Vendor[];
  now: () => number;
}

/**
 * Resend accepts 40 MB per email including the base64 overhead (~4/3): keep
 * attachments under this; bigger print files go as links only.
 */
export const MAX_ATTACH_BYTES = 25 * 1024 * 1024;

/** Step 1 (job): the admin's "Send to vendor" email. */
export async function emailHandoff(
  orderId: OrderId,
  deps: VendorDeps & { to: string; sendUrl: (vendorId: string) => string },
): Promise<{ sent: boolean; reason?: string }> {
  const order = await deps.commerce.getOrder(orderId);
  if (!order) return { sent: false, reason: "order not found" };
  if (order.status !== "processing")
    return { sent: false, reason: `order is ${order.status}` };
  const { parts, unassigned } = splitByVendor(order, deps.vendors);
  const missingFiles = order.lines.flatMap((l, i) =>
    l.printPngUrl ? [] : [i],
  );
  const mail = handoffEmail(order, parts, unassigned, {
    sendUrl: deps.sendUrl,
    missingFiles,
  });
  await deps.email.send({ to: deps.to, ...mail });
  await deps.commerce.addOrderNote(
    orderId,
    `"Send to vendor" email sent to ${deps.to}.`,
  );
  return { sent: true };
}

export interface SentRecord {
  sentAt: string;
  to: string;
  attached: string[];
}

export type SendPage =
  | { ok: false; message: string }
  | {
      ok: true;
      order: Order;
      part: VendorPart;
      sent: SentRecord | null;
      text: string;
    };

/** What the send page shows (also re-checked on Send). */
export async function loadSend(
  claims: SendClaims,
  deps: VendorDeps,
): Promise<SendPage> {
  const order = await deps.commerce.getOrder(claims.o);
  if (!order) return { ok: false, message: `Order #${claims.o} wasn't found.` };
  if (order.status !== "processing")
    return {
      ok: false,
      message: `Order #${order.id} is "${order.status}". Only orders set to Processing (confirmed with the customer) go to a vendor.`,
    };
  const part = splitByVendor(order, deps.vendors).parts.find(
    (p) => p.vendor.id === claims.v,
  );
  if (!part)
    return {
      ok: false,
      message: `Order #${order.id} has nothing for this vendor.`,
    };
  const raw = await deps.storage.get(vendorSentKey(order.id, part.vendor.id));
  const sent = raw
    ? (JSON.parse(new TextDecoder().decode(raw)) as SentRecord)
    : null;
  return {
    ok: true,
    order,
    part,
    sent,
    text: vendorMessage(order, part),
  };
}

/** Step 2 (the Send button): email the vendor their lines with the files attached. */
export async function sendToVendor(
  claims: SendClaims,
  deps: VendorDeps & {
    replyTo?: string;
    /**
     * Where to send it when the product has no `vendor_email` in WP admin:
     * the address typed on the send page. The saved one always wins.
     */
    to?: string;
  },
): Promise<{ ok: true; record: SentRecord } | { ok: false; message: string }> {
  const page = await loadSend(claims, deps);
  if (!page.ok) return page;
  const { order, part } = page;
  const to = part.vendor.email ?? deps.to?.trim();
  if (!to)
    return {
      ok: false,
      message: `No email address for ${part.vendor.name}: type one, or add vendor_email to the product in WP admin.`,
    };

  const attachments: EmailAttachment[] = [];
  let total = 0;
  const skipped: string[] = [];
  for (const { index } of part.lines) {
    const n = index + 1;
    const files = [
      {
        key: proofFileKey(order.id, index),
        filename: `order-${order.id}-line-${n}-proof.pdf`,
        contentType: "application/pdf",
      },
      {
        key: printFileKey(order.id, index),
        filename: `order-${order.id}-line-${n}-print.png`,
        contentType: "image/png",
      },
    ];
    for (const f of files) {
      const content = await deps.storage.get(f.key);
      if (!content) continue;
      if (total + content.byteLength > MAX_ATTACH_BYTES) {
        skipped.push(f.filename);
        continue;
      }
      total += content.byteLength;
      attachments.push({
        filename: f.filename,
        content,
        contentType: f.contentType,
      });
    }
  }

  const filesAttached = attachments.length > 0 && skipped.length === 0;
  await deps.email.send({
    to,
    subject: vendorSubject(order, part),
    text: vendorMessage(order, part, { filesAttached }),
    attachments,
    ...(deps.replyTo ? { replyTo: deps.replyTo } : {}),
  });

  const record: SentRecord = {
    sentAt: new Date(deps.now()).toISOString(),
    to,
    attached: attachments.map((a) => a.filename),
  };
  await deps.storage.put(
    vendorSentKey(order.id, part.vendor.id),
    JSON.stringify(record),
    { contentType: "application/json" },
  );
  await deps.commerce.addOrderNote(
    order.id,
    `Sent to ${part.vendor.name} (${to}) by email: line(s) ${part.lines
      .map((l) => l.index + 1)
      .join(
        ", ",
      )}, ${attachments.length} file(s) attached${skipped.length ? `, too big to attach (link only): ${skipped.join(", ")}` : ""}.`,
  );
  return { ok: true, record };
}
