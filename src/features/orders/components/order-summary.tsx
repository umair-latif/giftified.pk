import { formatPkr } from "@/features/checkout/format";
import type { OrderView } from "../order-view";

/** Lines, delivery and total of one order (order status page and account order page). */
export function OrderSummary({ view }: { view: OrderView }) {
  return (
    <section aria-label="Order summary" className="card p-4">
      <ul className="divide-ink/10 divide-y">
        {view.lines.map((line, i) => (
          <li
            key={i}
            className="flex justify-between gap-3 py-2 text-sm first:pt-0"
            data-testid="order-line"
          >
            <div className="min-w-0">
              <p className="text-ink font-semibold">{line.name}</p>
              <p className="text-ink/65">
                {line.variant ? `${line.variant} · ` : ""}Qty {line.quantity} ×{" "}
                {formatPkr(line.unitPricePkr)}
              </p>
            </div>
            <p className="shrink-0 font-semibold">
              {formatPkr(line.lineTotalPkr)}
            </p>
          </li>
        ))}
      </ul>
      <dl className="border-ink/15 mt-2 grid grid-cols-[1fr_auto] gap-y-1 border-t pt-2 text-sm">
        <dt className="text-ink/65">Delivery to {view.city}</dt>
        <dd className="text-right">{formatPkr(view.shippingPkr)}</dd>
        <dt className="font-semibold">
          {view.status === "completed" ? "Paid on delivery" : "Pay on delivery"}
        </dt>
        <dd
          className="text-accent-text text-right font-semibold"
          data-testid="order-total"
        >
          {formatPkr(view.totalPkr)}
        </dd>
      </dl>
    </section>
  );
}
