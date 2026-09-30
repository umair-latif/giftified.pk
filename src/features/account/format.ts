import { orderTimeline } from "@/features/orders/timeline";
import type { Order } from "@/types/order";

const dateFormat = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});

/** "30 Sept 2026" in Pakistan time; empty for a bad date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormat.format(d);
}

/** Where the order is now, in the timeline's words ("Placed", "Shipped", …). */
export function orderStatusLabel(order: Pick<Order, "status" | "tracking">) {
  const steps = orderTimeline(order);
  return (
    steps.find((s) => s.state === "current")?.label ??
    steps.filter((s) => s.state === "done").at(-1)?.label ??
    "Placed"
  );
}
