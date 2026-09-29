import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { loadHomeProductCards } from "@/features/home/load-product-cards";
import { Occasions } from "@/features/home/occasions";
import { loadRecentTemplates } from "@/features/home/recent-templates";
import { RecentTemplatesSection } from "@/features/home/recent-templates-section";
import { ProductsSection } from "@/features/home/products-section";
import { WhyGiftified } from "@/features/home/why-giftified";

/** ISR: prices come from WooCommerce; refresh the page at most hourly. */
export const revalidate = 3600;

export default async function Home() {
  const [cards, templates] = await Promise.all([
    loadHomeProductCards(),
    loadRecentTemplates(),
  ]);
  return (
    <main>
      <Hero />
      <ProductsSection cards={cards} />
      <RecentTemplatesSection templates={templates} />
      <HowItWorks />
      <Occasions />
      <WhyGiftified />
    </main>
  );
}
