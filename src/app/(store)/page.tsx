import { Hero } from "@/features/home/hero";
import { HowItWorks } from "@/features/home/how-it-works";
import { loadHomeProductCards } from "@/features/home/load-product-cards";
import { Occasions } from "@/features/home/occasions";
import { ProductsSection } from "@/features/home/products-section";
import { WhyGiftified } from "@/features/home/why-giftified";

/** ISR: prices come from WooCommerce; refresh the page at most hourly. */
export const revalidate = 3600;

export default async function Home() {
  const cards = await loadHomeProductCards();
  return (
    <main>
      <Hero />
      <ProductsSection cards={cards} />
      <HowItWorks />
      <Occasions />
      <WhyGiftified />
    </main>
  );
}
