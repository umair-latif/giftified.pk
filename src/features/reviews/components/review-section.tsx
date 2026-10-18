import { reviewMarkerKey } from "@/lib/storage/keys";
import { getStorage } from "@/lib/storage";
import type { OrderView } from "@/features/orders/order-view";
import type { Order } from "@/types/order";
import { ReviewForm } from "./review-form";

/**
 * "How was your order?" on the private order page: one form per item not yet
 * reviewed, only once the order is completed (delivered, cash collected).
 */
export async function ReviewSection({
  order,
  view,
  token,
}: {
  order: Order;
  view: OrderView;
  token: string;
}) {
  if (order.status !== "completed") return null;
  const storage = getStorage();
  const open = (
    await Promise.all(
      order.lines.map(async (_, i) =>
        (await storage.head(reviewMarkerKey(order.id, i))) ? null : i,
      ),
    )
  ).filter((i): i is number => i !== null);
  if (open.length === 0) return null;

  const firstName = order.customer.fullName.split(/\s+/)[0] ?? "";
  return (
    <section className="flex flex-col gap-3" aria-labelledby="review-title">
      <h2 id="review-title" className="text-lg font-semibold">
        How was your order?
      </h2>
      {open.map((i) => (
        <ReviewForm
          key={i}
          orderId={order.id}
          token={token}
          line={i}
          productName={view.lines[i]?.name ?? "Your item"}
          defaultName={firstName}
        />
      ))}
    </section>
  );
}
