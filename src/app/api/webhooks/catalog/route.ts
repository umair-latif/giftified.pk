import { revalidateTag } from "next/cache";
import { handleCatalogWebhook } from "@/features/catalog/catalog-webhook";
import { CATALOG_CACHE_TAG } from "@/lib/commerce/woocommerce";

/** WooCommerce product.* webhooks → refresh the cached catalog (docs/ops/woocommerce-staging.md). */
export async function POST(req: Request): Promise<Response> {
  return handleCatalogWebhook(req, process.env.WC_WEBHOOK_SECRET, () =>
    revalidateTag(CATALOG_CACHE_TAG, "max"),
  );
}
