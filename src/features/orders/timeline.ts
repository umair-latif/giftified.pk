import type { Order, OrderTracking } from "@/types/order";

export type TimelineStepId =
  "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type TimelineStepState = "done" | "current" | "upcoming";

export interface TimelineStep {
  id: TimelineStepId;
  label: string;
  state: TimelineStepState;
  /** Only on the "shipped" step, once the founder has entered it in WP admin. */
  tracking?: OrderTracking;
}

const LABELS: Record<TimelineStepId, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const FLOW = ["placed", "confirmed", "shipped", "delivered"] as const;

/**
 * Where an order is, as the customer sees it. WooCommerce statuses map to:
 *   on-hold → Placed, processing → Confirmed, processing + tracking → Shipped,
 *   completed → Delivered. A cancelled order shows Placed → Cancelled only.
 * Pure — unit-tested.
 */
export function orderTimeline(
  order: Pick<Order, "status" | "tracking">,
): TimelineStep[] {
  const step = (
    id: TimelineStepId,
    state: TimelineStepState,
  ): TimelineStep => ({
    id,
    label: LABELS[id],
    state,
    ...(id === "shipped" && order.tracking ? { tracking: order.tracking } : {}),
  });

  if (order.status === "cancelled")
    return [step("placed", "done"), step("cancelled", "current")];

  const current: (typeof FLOW)[number] =
    order.status === "completed"
      ? "delivered"
      : order.status === "processing"
        ? order.tracking
          ? "shipped"
          : "confirmed"
        : "placed";
  const at = FLOW.indexOf(current);
  return FLOW.map((id, i) =>
    step(id, i < at ? "done" : i === at ? "current" : "upcoming"),
  );
}
