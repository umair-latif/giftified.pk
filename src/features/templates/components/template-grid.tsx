import { OCCASIONS } from "@/features/home/occasions";
import type { TemplateMeta } from "@/server/templates/types";
import { withLiveDesigns } from "../load-design-prices";
import { templateHref, tileImage } from "../tile-image";
import { DesignTile } from "./design-tile";

const occasionLabel = (slug: string) =>
  OCCASIONS.find((o) => o.slug === slug)?.label ?? slug;

/**
 * Template cards: picture, name, occasion chips and (for design products) the
 * WooCommerce price, with the old price and a "Sale" pill when reduced.
 * `productNames` adds the product to each card (occasion pages mix products).
 */
export async function TemplateGrid({
  templates,
  productNames,
}: {
  templates: TemplateMeta[];
  productNames?: Record<string, string>;
}) {
  const { templates: live, prices } = await withLiveDesigns(templates);
  return (
    <ul
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      data-testid="template-grid"
    >
      {live.map((t) => (
        <li key={t.id}>
          <DesignTile
            href={templateHref(t)}
            name={t.name}
            subtitle={
              [productNames?.[t.productId], ...t.occasions.map(occasionLabel)]
                .filter(Boolean)
                .join(" · ") || "Personalise this design"
            }
            image={tileImage(t)}
            {...(prices[t.id] ? { price: prices[t.id] } : {})}
          />
        </li>
      ))}
    </ul>
  );
}
