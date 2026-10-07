import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductConfig } from "@/config/products";
import { DeliveryEstimate } from "./delivery-estimate";

/**
 * "Details about the product": always open (no accordion). Full width under
 * the gallery and the buy panel; on large screens the description sits left,
 * the facts and the delivery estimate right.
 */
export function ProductDetails({
  cfg,
  descriptionHtml,
  extraFacts,
  className = "",
}: {
  cfg: ProductConfig;
  /** Sanitised WooCommerce description; falls back to the product subtitle. */
  descriptionHtml?: string | undefined;
  /** More rows for the facts list (colours, sizes…), as <dt>/<dd> pairs. */
  extraFacts?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="product-details"
      className={`card p-4 lg:p-6 ${className}`}
      data-testid="product-details"
    >
      <h2 id="product-details" className="font-display text-ink text-lg">
        Details about the product
      </h2>
      <div className="mt-3 grid gap-5 lg:grid-cols-2 lg:gap-10">
        {descriptionHtml ? (
          <div
            className="text-ink min-w-0 space-y-2 text-sm break-words [&_img]:h-auto [&_img]:max-w-full [&_li]:ml-5 [&_li]:list-disc"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-ink text-sm">{cfg.subtitle}.</p>
        )}
        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">Print area</dt>
            <dd>
              {cfg.printArea.widthMm} × {cfg.printArea.heightMm} mm · printed at{" "}
              {cfg.printDpi} DPI
            </dd>
            {extraFacts}
            <dt className="text-zinc-500">Reprints</dt>
            <dd>
              Arrives damaged or misprinted? We&apos;ll put it right —{" "}
              <Link
                href="/help"
                className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-600/20 rounded underline focus-visible:ring-2 focus-visible:outline-none"
              >
                see Help
              </Link>
              .
            </dd>
          </dl>
          <DeliveryEstimate />
        </div>
      </div>
    </section>
  );
}
