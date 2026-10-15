"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductId } from "@/config/products";
import { ImageGallery, type GalleryItem } from "@/components/ui/image-gallery";
import { PageTitle } from "@/components/ui/page";
import { PriceTag } from "@/components/ui/price-tag";
import { buttonClass } from "@/components/ui/button";
import { formatPkr } from "@/features/checkout/format";
import { useProductColour } from "@/features/editor/colour";
import { useProductSize } from "@/features/editor/size";
import { selectionPrice, type ProductOptions } from "../catalog-model";

/** One radio chip: a real <input type="radio"> inside its label. */
const CHIP =
  "border-ink text-ink inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold has-[:checked]:bg-ink has-[:checked]:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:border-ink/25 has-[:disabled]:text-ink/40 has-[:disabled]:line-through has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-accent-text";

/**
 * The top of the product page: gallery, title, spec line, price, colour and
 * size, then the delivery box (slot) and the two ways to start. Picking a
 * colour swaps the main photo; colour and size go to the studio with the
 * link (and stay remembered on this phone), so nobody picks them twice.
 */
export function ProductBuy({
  productId,
  name,
  spec,
  options,
  gallery,
  fallbackArt,
  templateCount,
  templateFromPkr,
  designsHref,
  delivery,
  below,
}: {
  productId: ProductId;
  name: string;
  /** Spec line without the colour ("11oz gloss ceramic · full wrap"). */
  spec: string;
  options: ProductOptions;
  /** WooCommerce photos (duplicates removed, unique alt texts). */
  gallery: GalleryItem[];
  /** Shown when there are no photos at all. */
  fallbackArt: ReactNode;
  templateCount: number;
  templateFromPkr: number | null;
  designsHref: string;
  delivery: ReactNode;
  /** Reprint line, photo tips… under the buttons. */
  below: ReactNode;
}) {
  const [colourId, setColourId] = useProductColour({
    id: productId,
    baseColors: options.colours.map((c) => ({
      id: c.id,
      name: c.name,
      hex: (c.hex ?? "#ffffff") as `#${string}`,
    })),
  });
  const [size, setSize] = useProductSize(productId);

  const colour =
    options.colours.find((c) => c.id === colourId) ?? options.colours[0];
  const inStock = (s: string) =>
    options.variants.some(
      (v) => v.colourId === colour?.id && v.size === s && v.inStock,
    );
  const sizeOk = size && inStock(size) ? size : null;
  const price = colour ? selectionPrice(options, colour.id, sizeOk) : null;

  const items: GalleryItem[] = colour?.photo
    ? [
        {
          src: colour.photo.src,
          alt: colour.photo.alt,
          label: colour.name,
          className: "object-cover",
        },
        ...gallery.filter((g) => g.src !== colour.photo!.src),
      ]
    : gallery;

  const studio = new URLSearchParams();
  if (colour) studio.set("colour", colour.id);
  if (sizeOk) studio.set("size", sizeOk);

  return (
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 lg:gap-10">
      <div className="min-w-0">
        {items.length > 0 ? (
          // A new colour starts the gallery at its own photo.
          <ImageGallery key={colour?.id} testId="product" items={items} />
        ) : (
          fallbackArt
        )}
      </div>

      <div className="min-w-0 space-y-5">
        <header className="space-y-1">
          <PageTitle>{name}</PageTitle>
          <p className="text-ink/70 text-sm" data-testid="product-spec">
            {spec}
            {colour ? ` · ${colour.name}` : ""}
          </p>
          {price && (
            <p className="text-lg" data-testid="product-price">
              <PriceTag
                pkr={price.pricePkr}
                regularPkr={price.regularPricePkr}
                from={price.from}
              />
              {price.from && (
                <span className="text-ink/70 ml-2 text-sm">
                  depends on the size
                </span>
              )}
            </p>
          )}
        </header>

        {options.colours.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="text-ink text-sm font-semibold">
              Colour: <span className="font-normal">{colour?.name}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {options.colours.map((c) => (
                <label
                  key={c.id}
                  className={CHIP}
                  data-testid={`colour-${c.id}`}
                >
                  <input
                    type="radio"
                    name="colour"
                    value={c.id}
                    checked={c.id === colour?.id}
                    onChange={() => setColourId(c.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className="border-ink/25 size-5 rounded-full border"
                    style={{ backgroundColor: c.hex ?? "#e4e4e7" }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {options.sizes.length > 0 && (
          <fieldset className="space-y-2">
            <legend className="text-ink text-sm font-semibold">
              Size{" "}
              <span className="text-ink/70 font-normal">
                {sizeOk ? `: ${sizeOk}` : "(you can also choose it later)"}
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {options.sizes.map((s) => (
                <label key={s} className={CHIP} data-testid={`size-${s}`}>
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={s === sizeOk}
                    disabled={!inStock(s)}
                    onChange={() => setSize(s)}
                    className="sr-only"
                  />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {delivery}

        <div className="space-y-3">
          <Link
            href={`/design/${productId}?${studio.toString()}`}
            className={buttonClass("primary")}
            data-testid="start-designing"
          >
            Add your photo or text
          </Link>
          {templateCount > 0 && (
            <div>
              <Link
                href={designsHref}
                className={buttonClass("secondary")}
                data-testid="start-from-design"
              >
                Start from {templateCount} ready-made design
                {templateCount === 1 ? "" : "s"}
              </Link>
              {templateFromPkr !== null && (
                <p
                  className="text-ink/70 mt-1 text-sm"
                  data-testid="designs-from"
                >
                  Ready-made designs from{" "}
                  <span className="text-accent-text font-semibold">
                    {formatPkr(templateFromPkr)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
        {below}
      </div>
    </div>
  );
}
