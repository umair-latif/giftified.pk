import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "@/components/ui/price-tag";
import type { HomeProductCard } from "./product-cards";
import { Container } from "@/components/ui/page";

function CardBody({ card }: { card: HomeProductCard }) {
  return (
    <>
      <Image
        src={card.image}
        alt=""
        width={640}
        height={640}
        sizes="(min-width: 640px) 200px, 112px"
        className="bg-mint-100 size-28 shrink-0 rounded-xl object-cover sm:size-auto sm:w-full"
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center sm:justify-start">
        <span className="font-display text-brand-900 text-lg">{card.name}</span>
        <span className="text-ink line-clamp-2 text-sm">{card.note}</span>
        {card.href ? (
          card.fromPricePkr !== null && (
            <PriceTag
              from
              pkr={card.fromPricePkr}
              regularPkr={card.fromRegularPricePkr}
              className="text-brand-700 mt-1 text-sm sm:mt-auto sm:pt-1"
            />
          )
        ) : (
          <span className="bg-sunny text-ink mt-2 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium">
            Coming soon
          </span>
        )}
      </span>
    </>
  );
}

export function ProductsSection({ cards }: { cards: HomeProductCard[] }) {
  return (
    <section aria-labelledby="home-products" className="pt-8">
      <Container width="wide">
        <h2 id="home-products" className="text-brand-900 text-2xl">
          What will you make?
        </h2>
        <p className="text-ink mt-1 text-sm">
          Start with a blank product and make it yours.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li
              key={card.productId}
              className="flex"
              data-testid={`home-product-${card.productId}`}
            >
              {card.href ? (
                <Link
                  href={card.href}
                  className="hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 card card-pop flex w-full gap-4 p-3 focus-visible:ring-2 focus-visible:outline-none sm:flex-col"
                >
                  <CardBody card={card} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="card flex w-full gap-4 border-dashed! p-3 opacity-80 sm:flex-col"
                >
                  <CardBody card={card} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
