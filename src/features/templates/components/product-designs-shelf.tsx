import type { ProductId } from "@/config/products";
import { OCCASIONS } from "@/features/home/occasions";
import type { TemplateMeta } from "@/server/templates/types";
import { designsHref } from "../design-filters";
import { withLiveDesigns } from "../load-design-prices";
import { templateHref, tileImage } from "../tile-image";
import { DeleteTemplateButton } from "./delete-template-button";
import { DesignShelf } from "./design-shelf";

const occasionLabel = (slug: string) =>
  OCCASIONS.find((o) => o.slug === slug)?.label ?? slug;

/**
 * "Ready-made designs" on a product page: the product's published designs on
 * the same yellow shelf as the home page's "New designs". Design products
 * deleted in WooCommerce are left out; template editors get a Delete button.
 */
export async function ProductDesignsShelf({
  productId,
  templates,
}: {
  productId: ProductId;
  templates: TemplateMeta[];
}) {
  const { templates: live, prices } = await withLiveDesigns(templates);
  return (
    <DesignShelf
      id="designs"
      headingId="designs-heading"
      title={
        live.length > 0
          ? "Ready-made designs"
          : "Ready-made designs — coming soon"
      }
      intro={
        live.length > 0
          ? "Pick one, then swap in your own photos and words."
          : "Templates for Eid, birthdays, weddings and more are on the way."
      }
      testId="product-designs"
      tileTestId="product-design"
      className="mt-10"
      more={{
        href: designsHref({ product: productId }),
        label: "See all designs",
      }}
      items={live.map((t) => ({
        id: t.id,
        href: templateHref(t),
        name: t.name,
        subtitle:
          t.occasions.map(occasionLabel).join(" · ") ||
          "Personalise this design",
        image: tileImage(t),
        ...(prices[t.id] ? { price: prices[t.id] } : {}),
        extra: <DeleteTemplateButton id={t.id} name={t.name} />,
      }))}
    />
  );
}
