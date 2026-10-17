import { featuredOccasion } from "@/config/occasion-dates";
import { HelpBlock } from "@/features/home/help-block";
import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { loadHomeProductCards } from "@/features/home/load-product-cards";
import { Occasions } from "@/features/home/occasions";
import { loadRecentTemplates } from "@/features/home/recent-templates";
import { RecentTemplatesSection } from "@/features/home/recent-templates-section";
import { ProductsSection } from "@/features/home/products-section";
import { WhyDesignBanana } from "@/features/home/why-designbanana";

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
      {/* The three ways in — by product, by ready-made design, by occasion —
          run together, then the blocks that explain and reassure. Occasions
          sits third because the designs are the quickest path to an order
          (pick one, no designing); in the run-up to a big occasion it is
          worth moving up (founder, 17 Oct 2026). */}
      <ProductsSection cards={cards} />
      <RecentTemplatesSection templates={templates} />
      <Occasions featured={featuredOccasion(new Date())} />
      <HowItWorks />
      <WhyDesignBanana />
      <HelpBlock />
    </main>
  );
}
