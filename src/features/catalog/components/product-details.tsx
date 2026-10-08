import Link from "next/link";
import type { ReactNode } from "react";
import { Disclosure } from "@/components/ui/disclosure";
import { formatCm } from "@/lib/units";
import type { ProductConfig } from "@/config/products";

/**
 * "Details about the product": a card that opens and closes (closed at first,
 * so the page leads with the product and Start designing). Full width under
 * the gallery and the buy panel; when open, on large screens the description
 * sits left, the facts right. The delivery estimate is NOT in here: it sits
 * under the buy panel so it stays visible while the details are closed.
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
    <Disclosure
      id="details"
      className={`card overflow-hidden ${className}`}
      summaryClassName="lg:px-6 lg:py-4"
      bodyClassName="lg:px-6 lg:pb-6"
      summary={
        <h2 className="font-display text-ink text-lg">
          Details about the product
        </h2>
      }
      testId="product-details"
    >
      <div className="grid gap-5 pt-1 lg:grid-cols-2 lg:gap-10">
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
              Up to {formatCm(cfg.printArea.widthMm)} ×{" "}
              {formatCm(cfg.printArea.heightMm)} cm
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
        </div>
      </div>
    </Disclosure>
  );
}
