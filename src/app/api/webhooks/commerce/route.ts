import { getCommerce } from "@/lib/commerce";
import { handleCommerceWebhook } from "@/lib/commerce/webhook-handler";
import { inngest } from "@/server/jobs/client";
import { createOrderFilesSink } from "@/server/jobs/events";

const sink = createOrderFilesSink((event) => inngest.send(event));

/** WooCommerce `order.created` / `order.updated` webhooks (and WC's ping). */
export async function POST(req: Request): Promise<Response> {
  return handleCommerceWebhook(req, getCommerce(), sink);
}
