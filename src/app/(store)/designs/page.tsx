import type { Metadata } from "next";
import { Page, PageTitle } from "@/components/ui/page";
import { editableProductIds, getProduct } from "@/config/products";
import { OCCASIONS } from "@/features/home/occasions";
import {
  DesignCatalog,
  type CatalogCard,
} from "@/features/templates/components/design-catalog";
import {
  DESIGN_SORTS,
  occasionsOf,
  parseDesignFilters,
  type DesignSort,
} from "@/features/templates/design-filters";
import { withLiveDesigns } from "@/features/templates/load-design-prices";
import { loadTemplates } from "@/features/templates/load-templates";
import { templateHref, tileImage } from "@/features/templates/tile-image";

export const metadata: Metadata = {
  title: "Ready-made designs",
  description:
    "Ready-made designs for mugs, T-shirts and hoodies. Swap in your own photos, names and words. Cash on Delivery across Pakistan.",
  alternates: { canonical: "/designs" },
};

const productName = (id: string) => getProduct(id)?.name ?? id;
const occasionLabel = (slug: string) =>
  OCCASIONS.find((o) => o.slug === slug)?.label ?? slug;

const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * All published designs (the marketplace) with search, sort, a result count
 * and product/occasion filters that combine. The address carries the state
 * (`?product=mug&occasion=eid&q=markhor&sort=price-asc`), so the first render
 * comes from the server and links can be shared. Designs without an occasion
 * count as "Everyday".
 */
export default async function DesignsPage({
  searchParams,
}: PageProps<"/designs">) {
  const params = await searchParams;
  const filters = parseDesignFilters(params);
  const { templates: all, prices } = await withLiveDesigns(
    await loadTemplates(),
  );
  const designs: CatalogCard[] = all.map((t) => {
    const occasions = occasionsOf(t);
    const price = prices[t.id];
    return {
      id: t.id,
      name: t.name,
      productId: t.productId,
      productName: productName(t.productId),
      occasions,
      occasionLabels: occasions.map(occasionLabel),
      pricePkr: price?.pricePkr ?? null,
      createdAt: t.createdAt,
      href: templateHref(t),
      subtitle: [
        productName(t.productId),
        ...occasions.map(occasionLabel),
      ].join(" · "),
      image: tileImage(t),
      ...(price ? { price } : {}),
    };
  });
  // Only offer filters that have designs behind them.
  const products = editableProductIds()
    .filter((id) => all.some((t) => t.productId === id))
    .map((id) => ({ id, label: productName(id) }));
  const occasions = OCCASIONS.filter((o) =>
    designs.some((d) => d.occasions.includes(o.slug)),
  );
  const sort = first(params.sort);

  return (
    <Page width="wide">
      <PageTitle>Ready-made designs</PageTitle>
      <p className="text-ink/70 mt-1 text-sm">
        Made by our designers. Pick one, swap in your own photos, names and
        words, and order. Cash on Delivery.
        {/* TODO(owner): confirm the shown price includes your own photos and
            words; then say so here ("Price includes your personalisation"). */}
      </p>
      <DesignCatalog
        designs={designs}
        products={products}
        occasions={occasions}
        initial={{
          product: filters.product ?? "",
          occasion: filters.occasion ?? "",
          q: first(params.q).slice(0, 60),
          sort: DESIGN_SORTS.some((o) => o.id === sort)
            ? (sort as DesignSort)
            : "newest",
        }}
      />
    </Page>
  );
}
