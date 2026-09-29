import type { Metadata } from "next";
import { getProduct } from "@/config/products";
import { buildCatalogCards } from "@/features/catalog/catalog-model";
import { ProductCard } from "@/features/catalog/components/product-card";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { appBaseUrl } from "@/server/files/links";
import { Page, PageTitle } from "@/components/ui/page";

export const revalidate = 3600;

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title: "Products",
  description:
    "Custom mugs, t-shirts and hoodies with your photos and words. Design on your phone, pay cash on delivery across Pakistan.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage() {
  const cards = buildCatalogCards(await loadCatalog(), getProduct);
  return (
    <Page width="wide">
      <PageTitle>Design your own gift</PageTitle>
      <p className="mt-1 text-sm text-zinc-600">
        Pick a product, add your photos and words — pay cash when it arrives.
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card, i) => (
          <li key={card.productId}>
            <ProductCard card={card} priority={i === 0} />
          </li>
        ))}
      </ul>
    </Page>
  );
}
