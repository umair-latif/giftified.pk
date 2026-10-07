import { formatPkr } from "@/features/checkout/format";
import type { OrderView } from "../order-view";

/** Lines, delivery and total of one order (order status page and account order page). */
export function OrderSummary({ view }: { view: OrderView }) {
  return (
    <section aria-label="Order summary" className="card p-4">
      <ul className="divide-y divide-zinc-100">
        {view.lines.map((line, i) => (
          <li
            key={i}
            className="flex justify-between gap-3 py-2 text-sm first:pt-0"
            data-testid="order-line"
          >
            <div className="min-w-0">
              <p className="font-medium text-zinc-900">{line.name}</p>
              <p className="text-zinc-500">
                {line.variant ? `${line.variant} · ` : ""}Qty {line.quantity} ×{" "}
                {formatPkr(line.unitPricePkr)}
              </p>
            </div>
            <p className="shrink-0 font-medium">
              {formatPkr(line.lineTotalPkr)}
            </p>
          </li>
        ))}
      </ul>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 border-t border-zinc-200 pt-2 text-sm">
        <dt className="text-zinc-500">Delivery to {view.city}</dt>
        <dd className="text-right">{formatPkr(view.shippingPkr)}</dd>
        <dt className="font-semibold">
          {view.status === "completed" ? "Paid on delivery" : "Pay on delivery"}
        </dt>
        <dd className="text-right font-semibold" data-testid="order-total">
          {formatPkr(view.totalPkr)}
        </dd>
      </dl>
    </section>
  );
}
