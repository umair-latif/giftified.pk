import Image from "next/image";
import Link from "next/link";
import { CardCta } from "@/components/ui/card-cta";
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
        className="bg-soft size-28 shrink-0 rounded-xl object-cover sm:size-auto sm:w-full"
      />
      <div className="flex min-w-0 flex-col justify-center">
        <h3 className="type-card-title text-ink">{card.name}</h3>
        <p className="text-ink text-sm">{card.note}</p>
        {card.href ? (
          card.fromPricePkr !== null && (
            <PriceTag
              from={card.priceVaries}
              pkr={card.fromPricePkr}
              regularPkr={card.fromRegularPricePkr}
              className="mt-1 text-sm"
            />
          )
        ) : (
          <span className="border-ink text-ink mt-2 w-fit rounded-full border-2 bg-white px-2.5 py-0.5 text-xs font-semibold">
            Coming soon
          </span>
        )}
        {card.href && <CardCta className="mt-2">Start designing</CardCta>}
      </div>
    </>
  );
}

export function ProductsSection({ cards }: { cards: HomeProductCard[] }) {
  return (
    <section aria-labelledby="home-products" className="pt-8">
      <Container width="wide">
        <h2 id="home-products" className="type-section text-deep">
          What will you make?
        </h2>
        <p className="text-ink mt-1 text-sm">
          Start with a blank product and make it yours.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <li
              key={card.productId}
              data-testid={`home-product-${card.productId}`}
            >
              {card.href ? (
                <Link
                  href={card.href}
                  className="card card-pop flex gap-4 p-3 sm:flex-col"
                >
                  <CardBody card={card} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="card flex gap-4 border-dashed! p-3 opacity-80 sm:flex-col"
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
