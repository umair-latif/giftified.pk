import Image from "next/image";
import Link from "next/link";
import { CardCta } from "@/components/ui/card-cta";
import { PriceTag } from "@/components/ui/price-tag";
import type { CatalogCard } from "../catalog-model";
import { ProductArt } from "./product-art";
import { Swatches } from "./swatches";

/** Catalog grid card. Products without a print config show "Coming soon" and link nowhere. */
export function ProductCard({
  card,
  priority = false,
}: {
  card: CatalogCard;
  priority?: boolean;
}) {
  const body = (
    <>
      <div className="relative w-28 shrink-0 overflow-hidden rounded-xl sm:w-auto">
        {card.image ? (
          <Image
            src={card.image.src}
            alt={card.image.alt}
            width={480}
            height={480}
            sizes="(max-width: 640px) 112px, 320px"
            className="aspect-square w-full object-cover"
            preload={priority}
          />
        ) : (
          <ProductArt productId={card.productId} />
        )}
        {!card.href && (
          <span className="border-ink text-ink absolute top-2 left-2 rounded-full border-2 bg-white px-2 py-0.5 text-xs font-semibold">
            Coming soon
          </span>
        )}
      </div>
      <div className="min-w-0 space-y-1 self-center px-0.5 sm:mt-2 sm:self-auto">
        <h2 className="type-card-title text-ink">{card.name}</h2>
        <p className="text-ink/70 text-sm">{card.spec}</p>
        {card.fromPricePkr !== null && (
          <p className="text-ink text-sm">
            <PriceTag
              from={card.priceVaries}
              pkr={card.fromPricePkr}
              regularPkr={card.fromRegularPricePkr}
            />
          </p>
        )}
        {/* One colour = nothing to choose, so no dot (it looked like an empty radio button). */}
        {card.swatches.length > 1 && <Swatches swatches={card.swatches} />}
        {card.href && <CardCta>Start designing</CardCta>}
      </div>
    </>
  );
  return card.href ? (
    <Link
      href={card.href}
      className="card card-pop flex gap-3 p-2 sm:block"
      data-testid={`product-card-${card.productId}`}
    >
      {body}
    </Link>
  ) : (
    <div
      className="card flex gap-3 border-dashed! p-2 opacity-80 sm:block"
      aria-disabled="true"
      data-testid={`product-card-${card.productId}`}
    >
      {body}
    </div>
  );
}
