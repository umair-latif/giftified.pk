import Image from "next/image";
import Link from "next/link";
import { formatPkr } from "@/features/checkout/format";
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
      <div className="relative overflow-hidden rounded-xl">
        {card.image ? (
          <Image
            src={card.image.src}
            alt={card.image.alt}
            width={480}
            height={480}
            sizes="(max-width: 640px) 50vw, 240px"
            className="aspect-square w-full object-cover"
            preload={priority}
          />
        ) : (
          <ProductArt productId={card.productId} />
        )}
        {!card.href && (
          <span className="bg-sunny text-ink absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold">
            Coming soon
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1 px-0.5">
        <h2 className="font-display text-ink text-base leading-tight">
          {card.name}
        </h2>
        <p className="text-xs leading-snug text-zinc-600">{card.spec}</p>
        {card.fromPricePkr !== null && (
          <p className="text-sm text-zinc-900">
            from{" "}
            <span className="font-semibold">
              {formatPkr(card.fromPricePkr)}
            </span>
          </p>
        )}
        <Swatches swatches={card.swatches} />
      </div>
    </>
  );
  return card.href ? (
    <Link
      href={card.href}
      className="block rounded-2xl bg-white p-2 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50 active:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
      data-testid={`product-card-${card.productId}`}
    >
      {body}
    </Link>
  ) : (
    <div
      className="rounded-2xl bg-white p-2 opacity-80 ring-1 ring-zinc-200"
      aria-disabled="true"
      data-testid={`product-card-${card.productId}`}
    >
      {body}
    </div>
  );
}
