import type { Metadata } from "next";
import { getProduct } from "@/config/products";
import { buildCatalogCards } from "@/features/catalog/catalog-model";
import { ProductCard } from "@/features/catalog/components/product-card";
import { loadCatalog } from "@/features/catalog/load-catalog";
import { appBaseUrl } from "@/server/files/links";

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
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="font-display text-ink text-2xl">Design your own gift</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Pick a product, add your photos and words — pay cash when it arrives.
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card, i) => (
          <li key={card.productId}>
            <ProductCard card={card} priority={i === 0} />
          </li>
        ))}
      </ul>
    </main>
  );
}
