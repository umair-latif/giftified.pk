import { formatPkr } from "@/features/checkout/format";

/**
 * A price, with the old price struck through and a "Sale" pill when the
 * product is reduced in WooCommerce. `regularPkr` is only passed when it is
 * higher than `pkr`. `from` prefixes "from" for products sold in variants.
 */
export function PriceTag({
  pkr,
  regularPkr,
  from = false,
  className = "",
  testId,
  showSale = true,
}: {
  pkr: number;
  regularPkr?: number | null;
  from?: boolean;
  className?: string;
  testId?: string;
  /** Show the "Sale" pill (a tile can put it on the picture instead). */
  showSale?: boolean;
}) {
  const reduced = regularPkr != null && regularPkr > pkr;
  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}
      data-testid={testId}
    >
      {from && <span className="text-xs text-zinc-600">from</span>}
      <span className="font-semibold">{formatPkr(pkr)}</span>
      {reduced && (
        <>
          <s
            className="text-xs text-zinc-500"
            aria-label={`was ${formatPkr(regularPkr)}`}
          >
            {formatPkr(regularPkr)}
          </s>
          {showSale && (
            <span className="bg-magenta rounded-full px-1.5 py-px text-[11px] font-semibold text-white">
              Sale
            </span>
          )}
        </>
      )}
    </span>
  );
}
