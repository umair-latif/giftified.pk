import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "@/components/ui/price-tag";
import type { DesignPrice } from "../load-design-prices";

/**
 * One design card, the same size everywhere (template grids on product and
 * occasion pages, "New designs" on the home page).
 *
 * Uniform grid: the picture area is a fixed square, the title always reserves
 * two lines (longer titles are cut with "…", full text in the tooltip), the
 * second line is a single truncated line, and the price sits on the last row,
 * so every tile in a row has the same height.
 */
export function DesignTile({
  href,
  name,
  subtitle,
  image,
  price,
  testId,
}: {
  href: string;
  name: string;
  subtitle: string;
  /** A mockup fills the square; the flat artwork ("art") is shown whole. */
  image: { src: string; kind: "mockup" | "art" } | null;
  price?: DesignPrice;
  testId?: string;
}) {
  const reduced =
    price?.regularPricePkr != null && price.regularPricePkr > price.pricePkr;
  return (
    <Link
      href={href}
      title={name}
      data-testid={testId}
      className="hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/40 card card-pop flex h-full flex-col p-2 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-cream relative aspect-square overflow-hidden rounded-xl">
        {image && (
          <Image
            src={image.src}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
            className={
              image.kind === "mockup"
                ? // The mug sits in the middle of the photo with empty room around it:
                  // a little zoom on desktop fills the tile.
                  "object-cover md:scale-[1.15]"
                : "object-contain p-2"
            }
          />
        )}
        {reduced && (
          <span className="bg-magenta text-ink absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold">
            Sale
          </span>
        )}
      </div>
      <p className="text-ink mt-2 line-clamp-2 min-h-[2.5em] px-1 text-sm leading-tight font-medium">
        {name}
      </p>
      <p className="truncate px-1 text-xs text-zinc-500">{subtitle}</p>
      <div className="mt-auto min-h-6 px-1 pt-1 pb-1 text-sm text-zinc-900">
        {price && (
          <PriceTag
            pkr={price.pricePkr}
            regularPkr={price.regularPricePkr}
            testId="tile-price"
            showSale={false}
          />
        )}
      </div>
    </Link>
  );
}
