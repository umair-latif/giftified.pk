import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ReviewSection } from "@/features/reviews/components/review-section";
import { OrderSummary } from "@/features/orders/components/order-summary";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { RememberOrder } from "@/features/orders/components/remember-order";
import { loadOrderForLink } from "@/features/orders/order-access";
import { toOrderView } from "@/features/orders/order-view";
import { getCommerce } from "@/lib/commerce";
import { Page, PageTitle } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your order",
  // Private link: keep it out of search engines and out of Referer headers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Order status, opened from the private link `/order/<id>?t=<token>` (after
 * checkout, from /track or from "recent orders"). Without a valid token → 404,
 * so an order can't be opened by guessing its number. Rendered per request.
 */
export default async function OrderStatusPage(props: PageProps<"/order/[id]">) {
  await connection();
  const [{ id }, { t }] = await Promise.all([props.params, props.searchParams]);
  const order = await loadOrderForLink(id, t, getCommerce());
  if (!order || typeof t !== "string") notFound();
  const view = toOrderView(order);
  const justPlaced = view.status === "on-hold";

  return (
    <Page width="content" className="flex flex-col gap-4">
      <RememberOrder id={view.id} t={t} createdAt={view.createdAt} />
      <section className="card p-4">
        <PageTitle>{justPlaced ? "Thank you!" : "Your order"}</PageTitle>
        <p className="text-ink/65 mt-1 text-sm">
          Order number{" "}
          <span className="text-ink font-semibold" data-testid="order-number">
            #{view.id}
          </span>
        </p>
        <div className="mt-4">
          <OrderTimeline steps={view.timeline} maskedPhone={view.maskedPhone} />
        </div>
      </section>

      <OrderSummary view={view} />

      <ReviewSection order={order} view={view} token={t} />

      <p className="text-ink/70 text-center text-sm">
        Keep this page’s link to check your order later, or find it any time on{" "}
        <Link
          href="/track"
          className="text-accent-text hover:text-deep rounded-xl font-semibold underline"
        >
          Track your order
        </Link>
        .
      </p>
      <Link href="/" className={buttonClass("primary")}>
        Back to the shop
      </Link>
    </Page>
  );
}
