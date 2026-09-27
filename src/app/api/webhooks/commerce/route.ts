import { getCommerce } from "@/lib/commerce";
import { handleCommerceWebhook } from "@/lib/commerce/webhook-handler";

/** WooCommerce `order.created` / `order.updated` webhooks (and WC's ping). */
export async function POST(req: Request): Promise<Response> {
  return handleCommerceWebhook(req, getCommerce());
}
