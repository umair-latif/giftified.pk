import "server-only";
import type { CommerceClient } from "@/lib/commerce";
import { getProduct } from "@/config/products";
import { OCCASIONS } from "@/features/home/occasions";
import { newId } from "@/lib/id";
import { getStorage, type ObjectStorage } from "@/lib/storage";
import { saveTemplate, TemplateError } from "./store";
import type { SaveTemplateInput, TemplateMeta } from "./types";

export interface PublishProductInput extends Omit<
  SaveTemplateInput,
  "id" | "product"
> {
  description: string;
  /** Whole rupees. */
  pricePkr: number;
}

export interface PublishProductResult {
  meta: TemplateMeta;
  /** Set when the template is saved but the shop product still needs attention. */
  warning?: string;
}

/**
 * WooCommerce categories for a design product: one for the base product's
 * ready-made designs plus one per occasion, so coupons can target "all
 * ready-made mugs" or "Eid designs" in WP admin.
 */
function productCategories(input: {
  productId: SaveTemplateInput["productId"];
  occasions: SaveTemplateInput["occasions"];
}): string[] {
  const base = getProduct(input.productId)?.name;
  return [
    ...(base ? [`Ready-made ${base}`] : []),
    ...input.occasions.map(
      (slug) => OCCASIONS.find((o) => o.slug === slug)?.label ?? slug,
    ),
  ];
}

/** `birthday-card` from "Birthday Card!": lower-case ASCII words joined by "-". */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "design"
  );
}

/**
 * Publishes a design as a product (task 26). Order matters so a retry is
 * always clean: (1) create the WooCommerce draft product — if that fails
 * nothing is saved; (2) save the template with the product link; (3) publish
 * the product (with the thumbnail as its image). A failure in step 3 leaves a
 * saved template and a draft product, reported as a warning.
 */
export async function publishTemplateProduct(
  input: PublishProductInput,
  deps: {
    commerce: CommerceClient;
    storage?: ObjectStorage;
    /** Public URL WooCommerce can download the thumbnail from. */
    thumbnailUrl: (templateId: string) => string;
    makeId?: () => string;
  },
): Promise<PublishProductResult> {
  const name = input.name.trim();
  const description = input.description.trim();
  if (
    !Number.isInteger(input.pricePkr) ||
    input.pricePkr < 1 ||
    input.pricePkr > 1_000_000
  )
    throw new TemplateError("Enter a price in whole rupees", 400);
  if (!description) throw new TemplateError("Add a short description", 400);

  const id = (deps.makeId ?? newId)();
  const created = await deps.commerce.createDesignProduct({
    templateId: id,
    baseProductId: input.productId,
    name,
    description,
    pricePkr: input.pricePkr,
    categories: productCategories(input),
  });
  const meta = await saveTemplate(
    {
      ...input,
      name,
      id,
      product: {
        slug: `${slugify(name)}-${id.slice(0, 6).toLowerCase()}`,
        wooProductId: created.wooProductId,
        pricePkr: input.pricePkr,
        description,
      },
    },
    deps.storage ?? getStorage(),
  );
  if (!input.published) return { meta };
  try {
    await deps.commerce.publishDesignProduct(created.wooProductId, {
      imageUrl: input.thumbnail ? deps.thumbnailUrl(id) : undefined,
    });
  } catch (err) {
    console.error("[templates] publishing the shop product failed", err);
    return {
      meta,
      warning:
        "Saved, but the shop product is still a draft. Publish it in the WordPress admin.",
    };
  }
  return { meta };
}
