import "server-only";
import { getCommerce } from "@/lib/commerce";
import type { CommerceClient } from "@/lib/commerce/types";
import { getEmail, type EmailSender } from "@/lib/email";
import { getStorage } from "@/lib/storage";
import { reviewRequestKey } from "@/lib/storage/keys";
import type { ObjectStorage } from "@/lib/storage/types";
import { SITE } from "@/config/site";
import { appBaseUrl } from "@/server/files/links";
import { orderStatusUrl } from "@/server/orders/order-link";
import type { Order } from "@/types/order";

/**
 * Task 30: the "How was your order?" email, sent once when an order becomes
 * completed. The link is the private order page, where the review form shows.
 * Without an email address on the order the link goes into an order note
 * instead, so the founder can paste it into his own delivery message.
 */
export interface ReviewRequestDeps {
  commerce: Pick<CommerceClient, "getOrder" | "addOrderNote">;
  storage: ObjectStorage;
  email: EmailSender;
  env?: Record<string, string | undefined>;
  now?: () => number;
}

export type ReviewRequestResult =
  "sent" | "noted" | "already-handled" | "skipped";

export function reviewRequestMail(order: Order, link: string) {
  const first = order.customer.fullName.split(/\s+/)[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    `We hope you’re enjoying your order #${order.id}! Would you take a minute to tell us (and other customers) how it turned out? A photo of your finished product helps a lot.`,
    "",
    link,
    "",
    `Thank you,`,
    `${SITE.name}`,
  ].join("\n");
  return { subject: `How was your ${SITE.name} order #${order.id}?`, text };
}

export async function sendReviewRequest(
  orderId: number,
  deps: ReviewRequestDeps,
): Promise<ReviewRequestResult> {
  const order = await deps.commerce.getOrder(orderId);
  if (!order || order.status !== "completed") return "skipped";
  const key = reviewRequestKey(order.id);
  if (await deps.storage.head(key)) return "already-handled";

  const link = `${appBaseUrl(deps.env)}${orderStatusUrl(order, deps.env)}`;
  const result: ReviewRequestResult = order.email ? "sent" : "noted";
  // Mark first, so a crash between email and marker can't double-send on a
  // retry; the cost is that a failed send is not retried (the note covers it).
  await deps.storage.put(
    key,
    JSON.stringify({
      result,
      at: new Date((deps.now ?? Date.now)()).toISOString(),
    }),
    { contentType: "application/json" },
  );
  if (order.email) {
    try {
      await deps.email.send({
        to: order.email,
        ...reviewRequestMail(order, link),
      });
    } catch (err) {
      await deps.commerce.addOrderNote(
        order.id,
        `Review request email failed (${err instanceof Error ? err.message : String(err)}). Review link: ${link}`,
      );
      throw err;
    }
    await deps.commerce.addOrderNote(
      order.id,
      `Review request emailed to the customer. Review link: ${link}`,
    );
  } else {
    await deps.commerce.addOrderNote(
      order.id,
      `No customer email on this order. To ask for a review, send this link: ${link}`,
    );
  }
  return result;
}

export function reviewRequestDeps(): ReviewRequestDeps {
  return {
    commerce: getCommerce(),
    storage: getStorage(),
    email: getEmail(),
  };
}
