import { getProduct } from "@/config/products";
import type { Order, OrderId, OrderStatus } from "@/types/order";
import { maskMobileForDisplay } from "./mask";
import { orderTimeline, type TimelineStep } from "./timeline";

export interface OrderLineView {
  name: string;
  /** "Gloss White · M" — colour and size when known. */
  variant: string;
  quantity: number;
  unitPricePkr: number;
  lineTotalPkr: number;
}

/**
 * Everything the status page shows, and nothing more: the customer's name,
 * full phone, street address, landmark and email are dropped here so they
 * can't end up in the HTML of a page that anyone with the link can open.
 */
export interface OrderView {
  id: OrderId;
  status: OrderStatus;
  createdAt: string;
  city: string;
  maskedPhone: string;
  timeline: TimelineStep[];
  lines: OrderLineView[];
  shippingPkr: number;
  totalPkr: number;
}

export function toOrderView(order: Order): OrderView {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    city: order.customer.city,
    maskedPhone: maskMobileForDisplay(order.customer.phone),
    timeline: orderTimeline(order),
    lines: order.lines.map((line) => {
      const product = getProduct(line.productId);
      const colour =
        product?.baseColors.find((c) => c.id === line.colourId)?.name ??
        line.colourId;
      return {
        name: product?.name ?? line.productId,
        variant: [colour, line.size].filter(Boolean).join(" · "),
        quantity: line.quantity,
        unitPricePkr: line.unitPricePkr,
        lineTotalPkr: line.unitPricePkr * line.quantity,
      };
    }),
    shippingPkr: order.shippingPkr,
    totalPkr: order.totalPkr,
  };
}
