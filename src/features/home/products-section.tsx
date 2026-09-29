import Image from "next/image";
import Link from "next/link";
import { formatPkr } from "@/features/checkout/format";
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
      <span className="flex min-w-0 flex-col justify-center">
        <span className="font-display text-brand-900 text-lg">{card.name}</span>
        <span className="text-ink text-sm">{card.note}</span>
        {card.href ? (
          card.fromPricePkr !== null && (
            <span className="text-brand-700 mt-1 text-sm font-medium">
              from {formatPkr(card.fromPricePkr)}
            </span>
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
          Pick a product
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li
              key={card.productId}
              data-testid={`home-product-${card.productId}`}
            >
              {card.href ? (
                <Link
                  href={card.href}
                  className="hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 flex gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 focus-visible:ring-2 focus-visible:outline-none sm:flex-col"
                >
                  <CardBody card={card} />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex gap-4 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-3 opacity-80 sm:flex-col"
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
